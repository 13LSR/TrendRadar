"""Import upstream history with embedded Slack webhook URLs replaced by placeholders.

Creates a separate branch; never edits the checkout or the source reference.
Author, committer, dates, messages and merge topology are preserved. Signatures
on rewritten commits are removed because their original payload has changed.
"""

import argparse
import json
import re
import subprocess


WEBHOOK = re.compile(
    rb"https://hooks\.slack\.com/services/"
    rb"[A-Za-z0-9_-]+/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+"
)
PLACEHOLDER = b"https://hooks.slack.com/services/<WORKSPACE>/<CHANNEL>/<TOKEN>"


def sanitize(source, destination, exclude=None, git_executable="git"):
    def git(*args, data=None, check=True):
        return subprocess.run(
            [git_executable, *args], input=data, stdout=subprocess.PIPE,
            stderr=subprocess.PIPE, check=check,
        )

    def resolve(ref):
        return git("rev-parse", "--verify", "--end-of-options", ref + "^{commit}").stdout.strip().decode()

    source_sha = resolve(source)
    excluded_sha = resolve(exclude) if exclude else None
    git("check-ref-format", "--branch", destination)
    target = "refs/heads/" + destination
    worktrees = git("worktree", "list", "--porcelain").stdout.splitlines()
    if ("branch " + target).encode() in worktrees:
        raise ValueError("Destination is checked out; choose a separate branch.")
    old = git("show-ref", "--verify", "--hash", target, check=False).stdout.strip().decode()
    revisions = [source_sha] + (["^" + excluded_sha] if excluded_sha else [])
    commits = git("rev-list", "--reverse", "--topo-order", *revisions).stdout.decode().splitlines()
    commit_map, tree_map, blob_map = {}, {}, {}

    # Batch reads avoid one process per historical file. Inspect all reachable
    # blobs, including reused files, while only rewriting the selected commits.
    object_ids = git("rev-list", "--objects", "--no-object-names", source_sha).stdout
    types = git("cat-file", "--batch-check=%(objectname) %(objecttype)", data=object_ids).stdout
    blob_ids = [line.split(b" ")[0] for line in types.splitlines() if line.endswith(b" blob")]
    payload = git("cat-file", "--batch", data=b"\n".join(blob_ids) + b"\n").stdout
    offset = 0
    for _ in blob_ids:
        end = payload.index(b"\n", offset)
        oid, kind, size = payload[offset:end].split(b" ")
        if kind != b"blob":
            raise ValueError("Unexpected object type while reading history")
        offset = end + 1
        content = payload[offset:offset + int(size)]
        offset += int(size) + 1
        cleaned = WEBHOOK.sub(PLACEHOLDER, content)
        blob_map[oid] = git("hash-object", "-w", "--stdin", data=cleaned).stdout.strip() if cleaned != content else oid
    del payload

    def clean_tree(tree):
        if tree in tree_map:
            return tree_map[tree]
        records = git("ls-tree", "-z", tree).stdout.split(b"\0")
        changed = False
        for index, record in enumerate(records):
            if not record:
                continue
            metadata, path = record.split(b"\t", 1)
            mode, kind, oid = metadata.split(b" ")
            replacement = clean_tree(oid.decode()).encode() if kind == b"tree" else blob_map.get(oid, oid)
            if replacement != oid:
                records[index] = b" ".join([mode, kind, replacement]) + b"\t" + path
                changed = True
        tree_map[tree] = git("mktree", "-z", data=b"\0".join(records)).stdout.strip().decode() if changed else tree
        return tree_map[tree]

    for commit in commits:
        raw = git("cat-file", "commit", commit).stdout
        header, message = raw.split(b"\n\n", 1)
        blocks = re.split(rb"\n(?=[^ ])", header)
        updated = []
        changed = False
        for block in blocks:
            name, value = block.split(b" ", 1)
            replacement = block
            if name == b"tree":
                replacement = b"tree " + clean_tree(value.decode()).encode()
            elif name == b"parent":
                replacement = b"parent " + commit_map.get(value.decode(), value.decode()).encode()
            updated.append(replacement)
            changed |= replacement != block
        if changed:
            updated = [block for block in updated if block.split(b" ", 1)[0] not in (b"gpgsig", b"gpgsig-sha256", b"mergetag")]
            new_raw = b"\n".join(updated) + b"\n\n" + message
            commit_map[commit] = git("hash-object", "-t", "commit", "-w", "--stdin", data=new_raw).stdout.strip().decode()
        else:
            commit_map[commit] = commit

    result = commit_map.get(source_sha, source_sha)
    if excluded_sha:
        git("merge-base", "--is-ancestor", excluded_sha, result)
    if old:
        git("merge-base", "--is-ancestor", old, result)
    git("update-ref", target, result, old or "0" * 40)
    return {
        "source": source_sha, "destination": target, "commit": result,
        "visited_commits": len(commits),
        "rewritten_commits": sum(before != after for before, after in commit_map.items()),
        "sanitized_blobs": sum(before != after for before, after in blob_map.items()),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", help="Original upstream reference or pending local branch")
    parser.add_argument("destination", help="Separate output branch, e.g. codex/upstream-clean")
    parser.add_argument("--exclude", help="Keep published history unchanged; must remain an ancestor")
    parser.add_argument("--git-executable", default="git")
    arguments = parser.parse_args()
    try:
        print(json.dumps(sanitize(arguments.source, arguments.destination, arguments.exclude, arguments.git_executable), indent=2))
    except (ValueError, subprocess.CalledProcessError) as error:
        # Avoid printing document contents or secret values in diagnostics.
        parser.exit(1, f"History import failed: {error}\n")
