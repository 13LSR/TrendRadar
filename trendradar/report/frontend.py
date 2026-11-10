# coding=utf-8
"""Export report data for this repository's React frontend."""

import json
import tempfile
from pathlib import Path
from typing import Dict


REPORT_NAMES = {"daily": "当日汇总", "current": "当前榜单", "incremental": "增量分析"}


def _frontend_item(item: Dict, item_id: str, source: str = "", *, new: bool = False) -> Dict:
    ranks = item.get("ranks", [])
    rank = "-"
    if ranks:
        first, last = min(ranks), max(ranks)
        rank = str(first) if first == last or new else f"{first}-{last}"
    count = item.get("count", 1)
    return {
        "id": item_id,
        "source": source or item.get("source_name", ""),
        "rank": rank,
        "time": "JUST NOW" if new else item.get("time_display", "").replace(" ~ ", "~").replace("[", "").replace("]", ""),
        "views": "NEW" if new else (f"{count}次" if count > 1 else ""),
        "title": item["title"],
        "url": item.get("mobile_url") or item.get("url", ""),
        "isNew": new or item.get("is_new", False),
    }


def build_frontend_data(report_data: Dict, total_titles: int, mode: str, generated_at: str) -> Dict:
    """Keep the frontend contract independent of the upstream HTML renderer."""
    groups = []
    for stat in report_data.get("stats", []):
        group_id = len(groups) + 1
        items = [
            _frontend_item(item, f"{group_id}-{index}")
            for index, item in enumerate(stat["titles"], 1)
        ]
        groups.append({
            "id": group_id,
            "name": stat["word"],
            "count": stat["count"],
            "isHot": stat["count"] >= 10,
            "items": items,
        })

    hot_count = sum(len(group["items"]) for group in groups)
    new_items = []
    for source in report_data.get("new_titles", []):
        for item in source["titles"]:
            new_items.append(_frontend_item(
                item, f"new-{len(new_items) + 1}", source["source_name"], new=True,
            ))
    if new_items:
        groups.append({
            "id": len(groups) + 1,
            "name": "NEW_ARRIVALS // 新增热点",
            "count": len(new_items),
            "isHot": True,
            "items": new_items,
        })
    for group in groups:
        group["index"] = f"{group['id']:02d}/{len(groups):02d}"

    return {
        "meta": {
            "type": REPORT_NAMES[mode],
            "total": total_titles,
            "hot": hot_count,
            "generatedAt": generated_at,
            "status": "SYS_READY",
        },
        "groups": groups,
        "failed_ids": report_data.get("failed_ids", []),
    }


def write_frontend_data(report_data: Dict, total_titles: int, mode: str, output_path: str, generated_at: str) -> None:
    """Replace JSON atomically so readers never observe a partially written file."""
    destination = Path(output_path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    payload = build_frontend_data(report_data, total_titles, mode, generated_at)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w", encoding="utf-8", dir=destination.parent,
            prefix=f".{destination.name}.", suffix=".tmp", delete=False,
        ) as handle:
            temporary = Path(handle.name)
            json.dump(payload, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
        temporary.replace(destination)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)
    print(f"已生成前端数据文件: {destination}")
