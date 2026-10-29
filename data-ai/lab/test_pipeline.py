import sqlite3
import unittest
from generate_data import build_events
from pipeline import apply_events

class PipelineTest(unittest.TestCase):
    def setUp(self):
        self.db=sqlite3.connect(":memory:")
        self.addCleanup(self.db.close)

    def test_versions_deletion_unposting_and_repeat(self):
        events=build_events()
        self.assertEqual(apply_events(self.db,events)["total_kopecks"],13000)
        self.assertEqual(apply_events(self.db,events)["new_events"],0)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM sale_state WHERE posted=1 AND deleted=0").fetchone()[0],3)
        self.assertEqual(self.db.execute("SELECT org_id,SUM(revenue_kopecks) FROM mart_daily GROUP BY org_id ORDER BY org_id").fetchall(),[("ORG1",10000),("ORG2",3000)])
        self.assertEqual(self.db.execute("SELECT cursor FROM checkpoint").fetchone()[0],9)

    def test_rollback_and_recovery(self):
        with self.assertRaisesRegex(RuntimeError,"failpoint"):
            apply_events(self.db,build_events(),True)
        for table in ("sale_state","inbox","checkpoint","mart_daily"):
            self.assertEqual(self.db.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0],0)
        self.assertEqual(apply_events(self.db,build_events())["total_kopecks"],13000)

    def test_invalid_input_does_not_apply_partial_batch(self):
        events=build_events()
        events[-1]["payload"]["amount_kopecks"]="bad"
        with self.assertRaises(ValueError):
            apply_events(self.db,events)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM inbox").fetchone()[0],0)

    def test_same_id_in_different_source_is_independent(self):
        event=build_events()[0]
        other={**event,"source":"unf_demo"}
        result=apply_events(self.db,[event,other])
        self.assertEqual(result["total_kopecks"],20000)

if __name__=="__main__":
    unittest.main()
