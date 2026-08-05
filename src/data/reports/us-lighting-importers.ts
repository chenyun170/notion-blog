// 客户开发报告数据源：美国灯具进口商分析
// 新增报告：在 src/data/reports/ 目录新建一个 .ts 文件，复制本文件结构，
// 然后在 src/data/reports/index.ts 里注册即可，列表页/详情页自动生成。

export type ReportRow = string[];

export interface ReportBadge {
  label: string;
  value: string;
}

export interface ReportMetric {
  value: string;
  label: string;
}

export interface ReportTrend {
  title: string;
  value: string;
  note: string;
  type?: "peak" | "low";
}

export interface ReportBuyer {
  name: string;
  tag: string;
  points: string[];
  judge: string;
}

export interface ReportLayer {
  badge: string;
  cls: "a" | "b" | "c";
  title: string;
  desc: string;
}

export interface ReportSection {
  title: string;
  meta: string;
  kind:
    | "metrics"
    | "table"
    | "trend"
    | "buyers"
    | "layers"
    | "compliance"
    | "timing"
    | "next";
  // metrics
  metrics?: ReportMetric[];
  note?: string;
  // table
  headers?: string[];
  rows?: ReportRow[];
  highlight?: string[];
  insight?: string;
  insightHtml?: string;
  // trend
  trends?: ReportTrend[];
  // buyers
  buyers?: ReportBuyer[];
  // layers
  layers?: ReportLayer[];
  // next
  steps?: { num: string; title: string; desc: string }[];
  foot?: string;
}

export interface Report {
  slug: string;
  title: string;
  shortTitle: string;
  date: string;
  description: string;
  heroKicker: string;
  heroTitle: string;
  heroSub: string;
  badges: ReportBadge[];
  sections: ReportSection[];
}

export const usLightingImporters: Report = {
  slug: "us-lighting-importers",
  title: "客户开发报告：美国灯具进口商分析",
  shortTitle: "美国灯具进口商分析",
  date: "2026-08-05",
  description:
    "美国灯具（HS 9405）进口市场分析与开发方案：市场规模、头部采购商 Top 10、供应国竞争格局、旺季节奏与可直接开发的中国→美国买家名单。",
  heroKicker: "客户开发报告 · 2026-08-05",
  heroTitle: "美国灯具（HS 9405）<br />进口市场分析与开发方案",
  heroSub:
    "数据窗口：2025-08-05 ~ 2026-08-05 ｜ 分析人：周澈（海关数据顾问）",
  badges: [
    { label: "年进口额", value: "$21.5 亿" },
    { label: "活跃采购商", value: "14,594 家" },
    { label: "中国供应商", value: "9,283 家" },
    { label: "黄金开发窗口", value: "9-11 月" },
  ],
  sections: [
    {
      title: "一、市场规模（概览）",
      meta: "HS 9405 全品类",
      kind: "metrics",
      metrics: [
        { value: "$21.5 亿", label: "年进口总额（sum_amount = $2,151,573,745）" },
        { value: "14,594 家", label: "活跃采购商" },
        { value: "3,329 万条", label: "全量交易记录（含明细）" },
      ],
      note: "HS 9405 主要子类：枝形吊灯（940510/511/519）、台灯/床头灯/落地灯（940520/521/529）、LED 灯泡/灯带（940542）、装饰灯（940539）、灯具零件（940599）。",
    },
    {
      title: "二、头部采购商 Top 10",
      meta: "按交易次数排名",
      kind: "table",
      headers: ["排名", "采购商", "交易次数", "占比", "类型"],
      rows: [
        ["1", "NEW BRIGHT TECHNOLOGY (MACAO) LIMITED", "13,608", "4.23%", "澳门离岸采购"],
        ["2", "HONGKONG SNC LIGHTING CO., LIMITED", "12,475", "3.87%", "香港离岸采购"],
        ["3", "ELEC-TECH SOLID STATE LIGHTING(HK) LTD", "10,577", "3.29%", "香港离岸采购"],
        ["4", "WAYSPRIDE CHINA LIMITED", "9,089", "2.82%", "香港离岸采购"],
        ["5", "SUPERIOR LITE CORPORATION LIMITED", "6,887", "2.14%", "香港离岸采购"],
        ["6", "LG SOURCING, INC", "6,242", "1.94%", "LG 美国采购公司"],
        ["7", "HOME DEPOT, U. S. A., INC", "5,375", "1.67%", "家得宝 · 美国本土终端"],
        ["8", "HONG KONG HAO KANG ELECTRONIC CO., LTD", "4,187", "1.30%", "香港离岸采购"],
        ["9", "EVER WAVE CO.,LTD", "4,041", "1.26%", "香港离岸采购"],
        ["10", "ELIM COMPANY LIMITED", "3,840", "1.19%", "香港离岸采购"],
      ],
      insight:
        "Top 10 中多数为香港/澳门离岸贸易公司（代理进口），真正美国本土终端买家为 LG SOURCING（LG 美国采购公司）和 HOME DEPOT。头部集中度低（Top1 仅 4.23%），市场分散，新供应商有进入空间。",
    },
    {
      title: "三、供应国竞争格局",
      meta: "按单据量占比",
      kind: "table",
      headers: ["供应国", "单据数", "占比", "出口商家数"],
      rows: [
        ["越南 vn", "215,219", "66.84%", "1,516"],
        ["中国 cn", "52,127", "16.19%", "9,283"],
        ["香港 hk", "26,918", "8.36%", "786"],
        ["泰国 th", "3,274", "1.02%", "233"],
        ["印度 in", "3,075", "0.96%", "491"],
      ],
      highlight: ["66.84%"],
      insightHtml:
        "<b>关键信号：</b><ul><li>按单据量越南占 <b>66.84%</b>，但中国出口商数量最多（<b>9,283 家</b>），说明大量中国灯具经<strong>越南设厂/转口</strong>进入美国以规避关税；</li><li>对美出口主流仍是亚洲供应链，中国工厂的直接出口份额已明显被越南挤占，<strong>报价与产地策略需重新设计</strong>。</li></ul>",
    },
    {
      title: "四、月度趋势与旺季",
      meta: "采购前置期 4-6 个月",
      kind: "trend",
      trends: [
        { title: "峰值月：3-4 月", value: "45,703 / 45,529 单", note: "春季新品备货", type: "peak" },
        { title: "次级旺季：8-12 月", value: "22,219 ~ 28,588 单", note: "圣诞季备货" },
        { title: "低谷：6-7 月", value: "17,548 单", note: "数据截止 2026-07-09", type: "low" },
      ],
      insight:
        "灯具采购前置期约 4-6 个月，每年 9-11 月是开发次年春季订单的窗口，3-5 月是开发圣诞订单的窗口。",
    },
    {
      title: "五、重点买家深挖",
      meta: "三张大客户画像",
      kind: "buyers",
      buyers: [
        {
          name: "HOME DEPOT, U. S. A., INC",
          tag: "家得宝 · 零售巨头",
          points: [
            "月采购 569 次，年采购额 $313,619,374（3.14 亿美元）",
            "历史记录 13,651 条",
            "近期灯具采购主要来自越南（AUROLITE ELECTRICAL、DUC VY TECHNOLOGY）",
          ],
          judge: "采购体量巨大，但灯具订单已明显转移越南，切入需越南产地或差异化产品。",
        },
        {
          name: "LG SOURCING, INC",
          tag: "LG 美国采购",
          points: [
            "月采购 652 次，年采购额 $15,971,257（1,597 万美元）",
            "历史记录 15,660 条",
            "集中在 C9 圣诞灯串（HS 940539），主力供应商 KWANG TA ELECTRIC PHILS（菲律宾）",
          ],
          judge: "圣诞灯串类大买家，可凭成本与交期优势竞争，注意 UL 认证。",
        },
        {
          name: "SIGNIFY NORTH AMERICA CORP",
          tag: "昕诺飞/飞利浦北美",
          points: [
            "近期从中国 JIANGXI KLITE LIGHTING 采购 LED 灯泡",
            "单批 4,240 箱",
            "仍在从中国直接采购 LED 灯泡的头部品牌",
          ],
          judge: "LED 光源类中国工厂可直接接触的优质大客户。",
        },
      ],
    },
    {
      title: "六、近期中国 → 美国灯具买家名单",
      meta: "2026-05 ~ 08 活跃，可直接开发",
      kind: "table",
      headers: ["买家", "采购品类", "说明"],
      rows: [
        ["SIGNIFY NORTH AMERICA CORP", "LED 灯泡", "昕诺飞/飞利浦北美，大客户"],
        ["THE UTTERMOST CO", "树脂/铁/陶瓷台灯", "美国家居品牌"],
        ["MCGEE CO PARTNER LLC", "吊灯/壁灯/灯罩", "美国家居品牌"],
        ["FANGIO LIGHTING", "陶瓷台灯", "灯具进口商"],
        ["MASLA INC", "吊灯", "灯具进口商"],
        ["BIOLUZ LED", "LED 灯", "专业 LED 商"],
        ["ARCHIOLOGY INC", "灯具", "家居进口商"],
        ["THUNDER NORTH AMERICAN TRADE INC", "LED 灯具/灯泡", "贸易商"],
        ["GLOBALROOT INC", "装饰灯", "装饰灯商"],
        ["NAVARO INC", "LED 灯存储盒", "贸易商"],
        ["ULIGHTING TRADE LTD INC", "LED 灯带", "贸易商"],
        ["JOHN A STEER & CO", "LED 台灯", "贸易商"],
        ["FUTURE TRADING INC", "灯具", "贸易商"],
        ["HONGKONG HENGMEIRUI TRADING", "圣诞灯串", "港资贸易"],
      ],
    },
    {
      title: "七、开发方案（基于数据）",
      meta: "分层打法 + 合规 + 时机",
      kind: "layers",
      layers: [
        {
          badge: "A 类",
          cls: "a",
          title: "高价值直客，现有中国采购",
          desc: "SIGNIFY NORTH AMERICA、THE UTTERMOST CO、MCGEE CO PARTNER LLC —— 已有中国供应链记录，报价 + 认证齐备即可切入。",
        },
        {
          badge: "B 类",
          cls: "b",
          title: "零售巨头，需产地策略",
          desc: "HOME DEPOT、LG SOURCING —— 采购量大但主供在越南/菲律宾；需评估越南/东南亚布局，或提供差异化产品（智能照明、DLC 商用照明）绕开正面竞争。",
        },
        {
          badge: "C 类",
          cls: "c",
          title: "中型进口商/贸易商",
          desc: "FANGIO、MASLA、BIOLUZ、ARCHIOLOGY、THUNDER 等 —— 单量适中、决策快，适合作为首批试单客户。",
        },
      ],
    },
    {
      title: "产品与合规",
      meta: "",
      kind: "compliance",
      note: "",
      rows: [
        ["家用装饰照明（吊灯/台灯/壁灯）", "UL/ETL 认证是入场券；陶瓷、树脂、铁艺是美式主流材质"],
        ["LED 光源（灯泡/灯带）", "需 DLC / Energy Star（商用/补贴项目）"],
        ["节日灯串", "UL 588 季节性装饰标准，交货集中在 6-9 月"],
      ],
    },
    {
      title: "时机",
      meta: "",
      kind: "timing",
      note: "",
      rows: [
        ["9-11 月", "开发次年春季订单（对应 3-4 月到港高峰）"],
        ["3-5 月", "开发圣诞季订单（对应 8-12 月到港高峰）"],
        ["当前 8 月", "正处在圣诞订单备货启动期，是黄金开发窗口"],
      ],
    },
    {
      title: "下一步动作",
      meta: "",
      kind: "next",
      steps: [
        { num: "01", title: "获取完整名单", desc: "从 A 类客户中提取联系方式 + 黄金开发窗口话术" },
        { num: "02", title: "建立首页触达", desc: "产品册 / 认证齐全的灯具介绍页 + 黄金窗口策略" },
        { num: "03", title: "规划产地与报价", desc: "中国直供 vs 越南转口成本对比，定制差异化报价" },
      ],
      foot: "完整 20 家买家清单见本地文件 query_hs_product_*_dataarea6_cn.json",
    },
  ],
};
