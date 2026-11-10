"""Regression coverage for the custom website's upstream report integration."""

import json
import os
import tempfile
import unittest
from contextlib import chdir
from copy import deepcopy
from datetime import datetime
from pathlib import Path
from unittest.mock import patch

with patch.dict(os.environ, {"LITELLM_LOCAL_MODEL_COST_MAP": "True"}):
    from trendradar.context import AppContext
    from trendradar.core.loader import load_config
    from trendradar.report.frontend import build_frontend_data, write_frontend_data
    from trendradar.report.generator import prepare_report_data


def sample_stats():
    return [{
        "word": "科技前沿", "count": 2,
        "titles": [
            {"title": "芯片进展", "source_name": "IT之家", "time_display": "[08:00 ~ 09:00]",
             "count": 2, "ranks": [5, 1, 3], "rank_threshold": 5,
             "url": "https://example.com/desktop", "mobileUrl": "https://example.com/mobile"},
            {"title": "机器人发布", "source_name": "百度热搜", "time_display": "09:00",
             "count": 1, "ranks": [], "rank_threshold": 5, "is_new": True,
             "url": "https://example.com/robot"},
        ],
    }]


class FrontendReportTests(unittest.TestCase):
    def setUp(self):
        self.stats = sample_stats()
        self.new_titles = {"baidu": {
            "机器人发布": {"ranks": [4], "url": "https://example.com/robot"},
            "未匹配的广告": {"ranks": [1], "url": "https://example.com/advert"},
        }}

    def test_contract_uses_filtered_report_and_keeps_mobile_urls(self):
        report = prepare_report_data(self.stats, ["offline"], self.new_titles, {"baidu": "百度热搜"})
        data = build_frontend_data(report, 100, "daily", "2026-11-10 09:00")
        self.assertEqual(data["meta"], {
            "type": "当日汇总", "total": 100, "hot": 2,
            "generatedAt": "2026-11-10 09:00", "status": "SYS_READY",
        })
        self.assertEqual(data["failed_ids"], ["offline"])
        item = data["groups"][0]["items"][0]
        self.assertEqual((item["rank"], item["time"], item["views"]), ("1-5", "08:00~09:00", "2次"))
        self.assertEqual(item["url"], "https://example.com/mobile")
        self.assertEqual(data["groups"][0]["items"][1]["rank"], "-")
        self.assertEqual(data["groups"][0]["index"], "01/02")
        self.assertEqual(data["groups"][1]["index"], "02/02")
        self.assertEqual([item["title"] for item in data["groups"][1]["items"]], ["机器人发布"])
        self.assertTrue(data["groups"][1]["items"][0]["isNew"])

    def test_empty_report_is_valid_and_clears_previous_results(self):
        data = build_frontend_data(prepare_report_data([], ["offline"]), 0, "daily", "now")
        self.assertEqual(data["groups"], [])
        self.assertEqual(data["meta"]["hot"], 0)
        self.assertEqual(data["failed_ids"], ["offline"])

    def test_modes_and_new_section_use_upstream_filtering(self):
        for mode, label in [("daily", "当日汇总"), ("current", "当前榜单"), ("incremental", "增量分析")]:
            with self.subTest(mode=mode):
                report = prepare_report_data(self.stats, [], self.new_titles, {"baidu": "百度热搜"}, mode=mode)
                data = build_frontend_data(report, 100, mode, "now")
                self.assertEqual(data["meta"]["type"], label)
                self.assertEqual(len(data["groups"]), 1 if mode == "incremental" else 2)

    def test_context_exports_json_without_overwriting_react_homepage(self):
        ctx = AppContext({"FRONTEND_DATA_PATH": "data.json", "TIMEZONE": "Asia/Shanghai"})
        with tempfile.TemporaryDirectory() as directory, chdir(directory):
            Path("index.html").write_text("React homepage", encoding="utf-8")
            with patch.object(ctx, "render_html", return_value="Native report"),                  patch.object(ctx, "get_time", return_value=datetime(2026, 11, 10, 9, 0)):
                snapshot = ctx.generate_html(self.stats, 100)
            data = json.loads(Path("data.json").read_text(encoding="utf-8"))
            self.assertEqual(data["meta"]["generatedAt"], "2026-11-10 09:00")
            self.assertEqual(data["groups"][0]["name"], "科技前沿")
            self.assertEqual(Path("index.html").read_text(encoding="utf-8"), "React homepage")
            self.assertEqual(Path(snapshot).read_text(encoding="utf-8"), "Native report")
            self.assertEqual(Path("output/index.html").read_text(encoding="utf-8"), "Native report")
            self.assertTrue(Path("output/html/latest/daily.html").exists())

    def test_disabled_export_preserves_upstream_homepage_behavior(self):
        ctx = AppContext({})
        with tempfile.TemporaryDirectory() as directory, chdir(directory):
            with patch.object(ctx, "render_html", return_value="Native report"):
                ctx.generate_html(self.stats, 100)
            self.assertFalse(Path("data.json").exists())
            self.assertEqual(Path("index.html").read_text(encoding="utf-8"), "Native report")

    def test_translated_titles_and_hidden_new_section_reach_json(self):
        ctx = AppContext({"FRONTEND_DATA_PATH": "data.json", "DISPLAY": {"REGIONS": {"NEW_ITEMS": False}}})
        def translate(report):
            report = deepcopy(report)
            report["stats"][0]["titles"][0]["title"] = "Translated headline"
            return report
        with tempfile.TemporaryDirectory() as directory, chdir(directory):
            with patch.object(ctx, "render_html", return_value="Native report"):
                ctx.generate_html(self.stats, 100, new_titles=self.new_titles,
                                  id_to_name={"baidu": "百度热搜"}, translate_report_func=translate)
            data = json.loads(Path("data.json").read_text(encoding="utf-8"))
            self.assertEqual(len(data["groups"]), 1)
            self.assertEqual(data["groups"][0]["items"][0]["title"], "Translated headline")

    def test_failed_write_retains_last_good_data_and_removes_temporary_file(self):
        with tempfile.TemporaryDirectory() as directory, chdir(directory):
            Path("data.json").write_text('{"old": true}', encoding="utf-8")
            with patch("trendradar.report.frontend.json.dump", side_effect=OSError("disk full")):
                with self.assertRaises(OSError):
                    write_frontend_data({}, 0, "daily", "data.json", "now")
            self.assertEqual(json.loads(Path("data.json").read_text(encoding="utf-8")), {"old": True})
            self.assertEqual(list(Path('.').glob('.data.json.*.tmp')), [])

    def test_report_config_enables_frontend_export(self):
        with tempfile.TemporaryDirectory() as directory:
            config_path = Path(directory) / "config.yaml"
            config_path.write_text('report:\n  frontend_data_path: "site/data.json"\n', encoding="utf-8")
            self.assertEqual(load_config(str(config_path))["FRONTEND_DATA_PATH"], "site/data.json")


if __name__ == "__main__":
    unittest.main()
