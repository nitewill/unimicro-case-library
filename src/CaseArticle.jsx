import { RichContent } from "./RichTextEditor";
import { getConditionRows } from "./conditions";

export function CaseArticleContent({ item, preview = false }) {
  if (!item) return null;
  const conditionRows = getConditionRows(item);
  return <div className={`case-article${preview ? " case-article-preview" : ""}`}>
    <div className="detail-layout">
      <img src={item.image} alt={item.coverAlt || `${item.instrument}仪器配置`} />
      <div>
        <div className="tags"><span>{item.industry}</span><span>{item.detector}</span><span>{item.instrument}</span></div>
        <h3>应用背景</h3>
        <p>{item.background}</p>
      </div>
    </div>
    {item.standardReference && <div className="standard-reference"><strong>药典 / 标准依据</strong><span>{item.standardReference}</span></div>}
    <section className="article-section">
      <h3>实验条件</h3>
      {conditionRows.length ? <dl className="conditions-grid">{conditionRows.map((row, index) => <div key={row.id || `${row.label}-${index}`}><dt>{row.label || "未命名条件"}</dt><dd>{row.value || "—"}</dd></div>)}</dl> : <p className="conditions-empty">暂未填写实验条件</p>}
    </section>
    <section className="article-section">
      <h3>结果与结论</h3>
      <p>{item.result}</p>
    </section>
    {item.contentHtml && <section className="article-section article-rich-section"><RichContent html={item.contentHtml} /></section>}
  </div>;
}
