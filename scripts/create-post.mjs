// 手动通过原生 http/https 模块 + socks-proxy-agent 写 Notion API
// 不使用 @notionhq/client
import { SocksProxyAgent } from "socks-proxy-agent";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 从 .env 读取密钥，禁止硬编码 token
const __dirname = path.dirname(fileURLToPath(import.meta.url));
try {
  const envPath = path.resolve(__dirname, "../.env");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m || process.env[m[1]]) continue;
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
} catch {}

const PROXY = process.env.SOCKS_PROXY || "socks5://127.0.0.1:10808";
const TOKEN = process.env.NOTION_TOKEN;
const DB_ID = process.env.NOTION_DATABASE_ID;

if (!TOKEN || !DB_ID) {
  console.error("Missing NOTION_TOKEN or NOTION_DATABASE_ID. Put them in .env");
  process.exit(1);
}

const agent = new SocksProxyAgent(PROXY);

function notionRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`https://api.notion.com/v1${path}`);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method,
      agent,
      headers: {
        "Authorization": `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
    };
    
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (!res.statusCode || res.statusCode >= 400) {
            console.error(`❌ HTTP ${res.statusCode}:`, JSON.stringify(parsed, null, 2).slice(0, 500));
            reject(new Error(`Notion API ${res.statusCode}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on("error", (err) => {
      console.error("❌ Request error:", err.message);
      reject(err);
    });
    
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// 第一步：查询数据库 schema
console.log("=== 查询数据库字段 ===");
const db = await notionRequest("GET", `/databases/${DB_ID}`);
for (const [k, v] of Object.entries(db.properties)) {
  console.log(`  ${k} → type: ${v.type}`, 
    v.type === "status" ? `options: ${v.status?.options?.map(o => o.name).join(", ")}` : "",
    v.type === "multi_select" ? `options: ${v.multi_select?.options?.map(o => o.name).join(", ")}` : "",
  );
}

// 第二步：创建页面
console.log("\n=== 创建文章页面 ===");
const today = new Date().toISOString().split("T")[0];

const page = await notionRequest("POST", "/pages", {
  parent: { database_id: DB_ID, type: "database_id" },
  properties: {
    "Title": {
      title: [{ type: "text", text: { content: "海关数据到底怎么用？我用了三年，总结出五个步骤" } }],
    },
    "Slug": {
      rich_text: [{ type: "text", text: { content: "how-to-use-customs-data-five-steps" } }],
    },
    "Date": {
      date: { start: today },
    },
    "Status": {
      select: { name: "Published" },
    },
    "Summary": {
      rich_text: [{ type: "text", text: { content: "海关数据不是搜一下公司名就完事了。用对方法，它是外贸获客最强的工具之一。这篇文章拆解了我用了三年总结出的五个实操步骤。从 HS 编码到反向查竞争对手到找到决策人写开发信，每一步对应一个具体问题。" } }],
    },
    "Tags": {
      multi_select: [
        { name: "海关数据" },
        { name: "客户开发" },
        { name: "外贸技巧" },
        { name: "获客" },
      ],
    },
  },
});

console.log("✅ 页面创建成功:", page.id);

// 第三步：添加正文
const bodyContent = [
  { type: "heading_2", text: "第一步：用 HS 编码替代产品关键词" },
  { type: "paragraph", text: "很多人打开海关数据第一件事就是输入产品英文关键词。这一步就错了。海关申报用的是 HS 编码，不是产品名称。你搜\"LED light\"可能出来一部分结果，但有些企业报关用的是\"lighting fixture\"或者\"lamp\"或者\"illumination equipment\"——你搜不到的那些，竞争对手正在联系。但如果你用 HS 编码 9405.40 来搜，一条都不会漏。据海关总署官方归类体系，HS 编码前六位是全球统一的，后面的位数各国自定。把你的产品中文名输入海关归类查询页面，找到最匹配的那个编码，五分钟的事。这一步决定了你后面搜出来的数据是完整的还是漏了一半。" },
  { type: "heading_2", text: "第二步：看采购行为，别只看总量" },
  { type: "paragraph", text: "HS 编码输进去，你会看到一长串进口商名单。新手习惯按进口量从大到小排序，挑前几名开始联系。别这么干。量大的进口商不一定适合你。有些公司一年几百个柜，固定供应商合作了十年，你一封开发信根本撬不动。你要看的不是他的进口总量，是他的采购行为模式。三个关键指标：采购频率、供应商数量、供应商变动。" },
  { type: "paragraph", text: "如果一个客户固定从一家供应商采购，三年没换过——他重稳定。你开发信里要强调交期可靠、品控严格，别打价格。如果他的供应商换得很频繁，一年换了三四家——他对价格敏感，你要在保证质量的前提下给出有竞争力的报价，同时告诉他你比上一家好在哪。如果一个客户全年只有一两单但每单金额巨大——他做项目型采购，对技术能力和交付能力要求很高，开发信里得亮出你的案例和产能，而不是一张报价单。" },
  { type: "heading_2", text: "第三步：反向查竞争对手" },
  { type: "paragraph", text: "有一件事你大概率没做过：反过来查。海关数据不只告诉你谁在买，还告诉你谁在卖。你输入你竞争对手的公司名，能看到他们在给哪些客户供货。这些客户已经被你的同行验证过了——他们有需求、愿意从中国采购、而且正在买。你只需要做一件事：找到现成供应商的短板。交期慢？起订量太高？售后跟不上？找到了缝隙，你的开发信才有真正的切入点。" },
  { type: "heading_2", text: "第四步：找到决策人，别群发" },
  { type: "paragraph", text: "拿到公司名之后，下一步不是发邮件，是找人。海关数据只给你公司名，不给你联系人。你得用领英搜这家公司的采购经理、供应链总监或者老板。一封精心打磨的开发信发到 info@，跟发到采购经理的收件箱，打开率差一个数量级。查决策人的时候顺带看一眼他领英上最近发过什么。他上周刚发帖说\"在找新的亚洲供应商\"——你这就是天时地利。他在庆祝公司成立二十周年——你的开发信开头恭喜一下，打开率立刻不一样。" },
  { type: "heading_2", text: "第五步：带着功课写开发信" },
  { type: "paragraph", text: "以上全做完了，你对这个客户的了解已经不是\"一家做 XX 产品的公司\"了。你知道他过去六个月的采购量、采购频率、换过哪些供应商、供应商的报价区间大约在什么范围、决策人是谁、他最近在关注什么。到了这一步，开发信不需要任何模板。你只需要在邮件里写出来：我看到你们最近采购了什么、频率怎样、供应商是谁。然后告诉他，你这有什么不同。对方打开这封邮件的反应不是\"又来一个推销的\"，是\"这人做了功课\"。" },
  { type: "heading_2", text: "工具让筛选变得自动化" },
  { type: "paragraph", text: "五个步骤里，前三步以前我一个客户就要花一两个小时——查 HS 编码、翻报关单、比对供应商记录、搜领英。现在我早上把公司名输进 OraAgent，采购记录、行为分析、决策人信息跟着一起出来。省下来的时间，我放在写邮件和跟客户聊天上——那才是成单的地方。海关数据本身不贵。贵的是你花在筛选上的时间。工具把筛选自动化了，海关数据才真正从摆设变成了获客引擎。" },
  { type: "callout", text: "OraAgent 公测到 7 月 31 号，新老客户免费最长三年。链接放评论区。https://oraagent.eu.cc/" },
];

const blocks = bodyContent.map((block) => {
  const richText = [{ type: "text", text: { content: block.text } }];
  if (block.type === "heading_2") { return { object: "block", type: "heading_2", heading_2: { rich_text: richText } }; }
  if (block.type === "callout") { return { object: "block", type: "callout", callout: { rich_text: richText, icon: { emoji: "🚀" } } }; }
  return { object: "block", type: "paragraph", paragraph: { rich_text: richText } };
});

const BATCH_SIZE = 50;
for (let i = 0; i < blocks.length; i += BATCH_SIZE) {
  const batch = blocks.slice(i, i + BATCH_SIZE);
  await notionRequest("PATCH", `/blocks/${page.id}/children`, { children: batch });
  const end = Math.min(i + BATCH_SIZE, blocks.length);
  console.log(`  ✅ 已添加内容块 ${i+1}-${end}/${blocks.length}`);
}

console.log("\n🎉 全部完成！文章已写入 Notion");
console.log(`   标题: 海关数据到底怎么用？我用了三年，总结出五个步骤`);
console.log(`   Slug: how-to-use-customs-data-five-steps`);
console.log(`   日期: ${today}`);
console.log(`   Notion ID: ${page.id}`);
