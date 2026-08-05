// 客户开发报告注册表
// 新增报告步骤：
// 1. 在 src/data/reports/ 下新建 xxx.ts，按 us-lighting-importers.ts 的结构导出 Report
// 2. 在下方 import 并加入 REPORTS 数组
// 3. 构建后 /customer-report/ 列表页和 /customer-report/[slug]/ 详情页自动生成
import { usLightingImporters } from "./us-lighting-importers";

export type { Report, ReportSection, ReportBadge, ReportMetric, ReportTrend, ReportBuyer, ReportLayer, ReportRow } from "./us-lighting-importers";

export const REPORTS = [usLightingImporters];

export function getReportBySlug(slug: string) {
  return REPORTS.find((report) => report.slug === slug);
}

export function getReports() {
  return [...REPORTS].sort((a, b) => b.date.localeCompare(a.date));
}
