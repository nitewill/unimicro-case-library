import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, Check, Eye, FloppyDisk, ImageSquare, Plus, SpinnerGap, Trash, X } from "@phosphor-icons/react";
import { detectors, industries, instruments, officialCases, officialDatasetVersion } from "./data";
import { saveCase, seedOfficialDataset } from "./db";
import { CaseArticleContent } from "./CaseArticle";
import { RichTextEditor } from "./RichTextEditor";
import { conditionLabels, conditionRowsToLegacy, getConditionRows } from "./conditions";

const defaultConditions = {
  column: "",
  mobilePhase: "",
  flowRate: "",
  temperature: "",
  injection: "",
};
const makeDefaultConditionRows = () => Object.entries(defaultConditions).map(([key, value]) => ({ id: `legacy-${key}`, key, label: conditionLabels[key], value }));
const defaultTaxonomies = { industry: industries, detector: detectors, instrument: instruments };

const blankCase = {
  title: "",
  summary: "",
  industry: industries[0],
  detector: detectors[0],
  instrument: instruments[0],
  image: "/assets/hplc-elsd.png",
  coverAlt: "通微液相色谱仪器配置",
  background: "",
  standardReference: "",
  conditions: defaultConditions,
  conditionRows: makeDefaultConditionRows(),
  result: "",
  contentHtml: "<h2>方法说明</h2><p>在这里补充样品前处理、方法开发过程或其他说明。</p><h2>图谱与数据</h2><p>可使用上方工具栏插入谱图图片或数据表格。</p>",
  contact: "技术支持｜021-38953588｜info@unimicrotech.com.cn",
};

function caseImageForInstrument(instrument) {
  if (instrument.includes("AutoCE") || instrument.includes("CE-")) return "/assets/capillary-electrophoresis.png";
  if (instrument.includes("UHPLC")) return "/assets/uhplc-system.png";
  return "/assets/hplc-elsd.png";
}

function CmsAdminHeader() {
  return <><header className="admin-header"><div className="brand-lockup"><img src="/assets/unimicro-logo.png" alt="通微 UNIMICRO" /><span className="brand-divider" /><span className="brand-title">应用案例库 · 内容管理后台</span></div><a href="#/" className="button secondary">返回案例库</a></header><nav className="admin-nav" aria-label="后台导航"><a className="active" href="#/admin/cases">案例管理</a><a href="#/admin/taxonomies">分类设置</a><a href="#/admin/requests">应用需求</a></nav></>;
}

function InputField({ label, required, hint, children }) {
  return <label className="cms-field"><span className="cms-label">{label}{required && <em>*</em>}</span>{children}{hint && <small>{hint}</small>}</label>;
}

function PreviewLayer({ item, onClose }) {
  return <div className="cms-preview-layer" role="dialog" aria-modal="true" aria-label="前台案例预览"><button type="button" className="modal-scrim" onClick={onClose} aria-label="关闭预览" /><article className="cms-preview-modal"><div className="modal-heading"><div><span className="eyebrow">前台展示预览</span><h2>{item.title || "未命名案例"}</h2></div><button type="button" className="icon-button" onClick={onClose} title="关闭"><X size={23} /></button></div><CaseArticleContent item={item} /><div className="cms-preview-footer"><span>{item.contact}</span><span className="button primary preview-disabled-button">下载完整 PDF</span></div></article></div>;
}

export function CaseEditorPage({ caseId }) {
  const isNew = !caseId;
  const [draft, setDraft] = useState(null);
  const [taxonomies, setTaxonomies] = useState(defaultTaxonomies);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    let active = true;
    seedOfficialDataset(officialCases, defaultTaxonomies, officialDatasetVersion).then(({ cases: items, taxonomies: groups }) => {
      if (!active) return;
      setTaxonomies(groups);
      const found = caseId ? items.find((item) => item.id === caseId) : null;
      const source = found ? { ...blankCase, ...found, conditions: { ...defaultConditions, ...found.conditions } } : { ...blankCase, conditions: { ...defaultConditions } };
      setDraft({ ...source, conditionRows: found ? getConditionRows(found) : makeDefaultConditionRows() });
      if (caseId && !found) setError("未找到需要编辑的案例，已打开新增案例页面。");
    }).catch((loadError) => setError(loadError instanceof Error ? loadError.message : "案例读取失败")).finally(() => setLoading(false));
    return () => { active = false; };
  }, [caseId]);

  const completion = useMemo(() => {
    if (!draft) return [];
    return [
      ["案例标题与摘要", Boolean(draft.title.trim() && draft.summary.trim())],
      ["行业、检测器与仪器", Boolean(draft.industry && draft.detector && draft.instrument)],
      ["应用背景", Boolean(draft.background.trim())],
      ["实验条件", draft.conditionRows.length > 0 && draft.conditionRows.every((row) => row.label.trim() && row.value.trim())],
      ["结果与结论", Boolean(draft.result.trim())],
      ["案例正文或图谱", Boolean(draft.contentHtml?.replace(/<[^>]*>/g, "").trim() || draft.contentHtml?.includes("<img"))],
    ];
  }, [draft]);

  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const updateCondition = (id, field, value) => setDraft((current) => ({ ...current, conditionRows: current.conditionRows.map((row) => row.id === id ? { ...row, [field]: value } : row) }));
  const addCondition = () => setDraft((current) => ({ ...current, conditionRows: [...current.conditionRows, { id: crypto.randomUUID(), key: `custom-${crypto.randomUUID()}`, label: "", value: "" }] }));
  const deleteCondition = (id) => setDraft((current) => ({ ...current, conditionRows: current.conditionRows.filter((row) => row.id !== id) }));
  const moveCondition = (index, direction) => setDraft((current) => {
    const target = index + direction;
    if (target < 0 || target >= current.conditionRows.length) return current;
    const rows = [...current.conditionRows];
    [rows[index], rows[target]] = [rows[target], rows[index]];
    return { ...current, conditionRows: rows };
  });
  const updateInstrument = (instrument) => setDraft((current) => ({ ...current, instrument, image: current.image?.startsWith("data:") ? current.image : caseImageForInstrument(instrument) }));

  const uploadCover = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { setNotice("封面图请选择图片文件"); return; }
    if (file.size > 5 * 1024 * 1024) { setNotice("封面图片不能超过 5MB"); return; }
    const reader = new FileReader();
    reader.onload = () => update("image", String(reader.result));
    reader.onerror = () => setNotice("封面图读取失败，请重试");
    reader.readAsDataURL(file);
  };

  const save = async (event) => {
    event.preventDefault();
    setError("");
    if (!draft.title.trim() || !draft.summary.trim() || !draft.background.trim() || !draft.result.trim()) { setError("请填写案例标题、摘要、应用背景和结果与结论。 "); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    if (!draft.conditionRows.length || draft.conditionRows.some((row) => !row.label.trim() || !row.value.trim())) { setError("请至少保留一项实验条件，并完整填写参数名称和参数值。"); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    setSaving(true);
    try {
      const conditionRows = draft.conditionRows.map((row) => ({ ...row, label: row.label.trim(), value: row.value.trim() }));
      await saveCase({ ...draft, standardReference: (draft.standardReference || "").replace(/\r\n?/g, "\n").trim(), conditionRows, conditions: conditionRowsToLegacy(conditionRows), id: draft.id || crypto.randomUUID(), updatedAt: new Date().toISOString() });
      window.location.hash = "#/admin/cases";
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "保存失败，请重试"); }
    finally { setSaving(false); }
  };

  if (loading || !draft) return <div className="admin-shell"><CmsAdminHeader /><div className="cms-editor-loading"><SpinnerGap size={24} className="spin" />正在载入案例内容…</div></div>;

  return <div className="admin-shell cms-editor-shell"><CmsAdminHeader /><form className="cms-editor-form" onSubmit={save}>
    <header className="cms-editor-topbar">
      <div><a href="#/admin/cases" className="cms-back"><ArrowLeft size={18} />返回案例管理</a><h1>{isNew ? "新增案例" : "编辑案例"}</h1><p>完整编辑前台案例的文字、实验条件、数据表格与图片内容</p></div>
      <div className="cms-top-actions"><button type="button" className="button secondary" onClick={() => setPreviewOpen(true)}><Eye size={18} />预览前台效果</button><button type="submit" className="button primary" disabled={saving}>{saving ? <SpinnerGap size={18} className="spin" /> : <FloppyDisk size={18} />}{saving ? "正在保存" : "保存案例"}</button></div>
    </header>
    {error && <div className="cms-alert cms-alert-error">{error}</div>}
    {notice && <div className="cms-alert"><span>{notice}</span><button type="button" className="text-button" onClick={() => setNotice("")}>知道了</button></div>}
    <div className="cms-editor-grid">
      <main className="cms-editor-main">
        <section className="cms-panel">
          <div className="cms-panel-heading"><div><span className="cms-section-index">01</span><h2>案例基本内容</h2></div><p>标题和摘要用于列表卡片与案例详情页头部。</p></div>
          <div className="cms-panel-body cms-basic-grid">
            <InputField label="案例标题" required hint="建议包含仪器/检测器、样品或目标成分"><input value={draft.title} onChange={(event) => update("title", event.target.value)} maxLength="80" placeholder="例如：HPLC-ELSD 检测妥布霉素滴眼液" /></InputField>
            <InputField label="案例摘要" required hint="建议 60–120 字，用于客户快速判断案例是否相关"><textarea value={draft.summary} onChange={(event) => update("summary", event.target.value)} maxLength="220" placeholder="概括检测目标、方法特点和主要价值" /></InputField>
          </div>
        </section>

        <section className="cms-panel">
          <div className="cms-panel-heading"><div><span className="cms-section-index">02</span><h2>应用背景与实验方法</h2></div><p>这些结构化内容会同步用于前台详情与 PDF 报告。</p></div>
          <div className="cms-panel-body">
            <InputField label="药典 / 标准依据（可选）" hint="每条标准填写一行；留空后前台与 PDF 均不显示。"><textarea className="cms-standard-textarea" rows="4" value={draft.standardReference || ""} onChange={(event) => update("standardReference", event.target.value)} placeholder={"例如：\n《中国药典》2025年版\nGB 5009.8—2023《食品安全国家标准……》"} /></InputField>
            <InputField label="应用背景" required><textarea className="cms-large-textarea" value={draft.background} onChange={(event) => update("background", event.target.value)} placeholder="说明检测对象、行业背景、方法难点和解决思路" /></InputField>
            <div className="cms-subsection-title condition-title-row"><div><h3>实验条件</h3><span>可新增、修改、删除和调整展示顺序</span></div><button type="button" className="button secondary condition-add-button" onClick={addCondition}><Plus size={16} />新增条件</button></div>
            <div className="condition-editor-table dynamic-condition-table"><div className="condition-table-head"><span>参数名称</span><span>参数值</span><span>排序与操作</span></div>{draft.conditionRows.length ? draft.conditionRows.map((row, index) => <div className="condition-editor-row" key={row.id}><span className="condition-row-number">{String(index + 1).padStart(2, "0")}</span><input aria-label={`第 ${index + 1} 项参数名称`} value={row.label} onChange={(event) => updateCondition(row.id, "label", event.target.value)} placeholder="例如：检测波长" /><input aria-label={`第 ${index + 1} 项参数值`} value={row.value} onChange={(event) => updateCondition(row.id, "value", event.target.value)} placeholder="例如：254 nm" /><div className="condition-row-actions"><button type="button" className="icon-button" title="上移" aria-label={`上移第 ${index + 1} 项实验条件`} disabled={!index} onClick={() => moveCondition(index, -1)}><ArrowUp size={17} /></button><button type="button" className="icon-button" title="下移" aria-label={`下移第 ${index + 1} 项实验条件`} disabled={index === draft.conditionRows.length - 1} onClick={() => moveCondition(index, 1)}><ArrowDown size={17} /></button><button type="button" className="icon-button danger-icon" title="删除" aria-label={`删除第 ${index + 1} 项实验条件`} onClick={() => deleteCondition(row.id)}><Trash size={17} /></button></div></div>) : <div className="condition-empty-state"><p>暂未添加实验条件</p><button type="button" className="text-button" onClick={addCondition}><Plus size={15} />添加第一项条件</button></div>}</div>
            <InputField label="结果与结论" required><textarea className="cms-large-textarea" value={draft.result} onChange={(event) => update("result", event.target.value)} placeholder="填写分离度、回收率、重复性、检出限等关键结果和结论" /></InputField>
            <InputField label="联系信息" hint="显示在案例详情底部与 PDF 中"><input value={draft.contact} onChange={(event) => update("contact", event.target.value)} placeholder="部门｜电话｜邮箱" /></InputField>
          </div>
        </section>

        <section className="cms-panel cms-rich-panel">
          <div className="cms-panel-heading"><div><span className="cms-section-index">03</span><h2>案例正文与图谱</h2></div><p>支持标题、粗体、列表、引用、链接、对齐、表格、图片和撤销重做。</p></div>
          <div className="cms-panel-body"><RichTextEditor value={draft.contentHtml} onChange={(value) => update("contentHtml", value)} onImageError={setNotice} /></div>
        </section>
      </main>

      <aside className="cms-editor-aside">
        <section className="cms-panel cms-sticky-panel">
          <div className="cms-panel-heading compact"><div><h2>案例属性</h2></div></div>
          <div className="cms-panel-body cms-aside-fields">
            <InputField label="应用行业" required><select value={draft.industry} onChange={(event) => update("industry", event.target.value)}>{taxonomies.industry.map((option) => <option key={option}>{option}</option>)}</select></InputField>
            <InputField label="检测器" required><select value={draft.detector} onChange={(event) => update("detector", event.target.value)}>{taxonomies.detector.map((option) => <option key={option}>{option}</option>)}</select></InputField>
            <InputField label="仪器" required><select value={draft.instrument} onChange={(event) => updateInstrument(event.target.value)}>{taxonomies.instrument.map((option) => <option key={option}>{option}</option>)}</select></InputField>
            <div className="cms-cover-field"><span className="cms-label">封面 / 仪器图片</span><div className="cms-cover-preview"><img src={draft.image} alt={draft.coverAlt || "案例封面预览"} /></div><label className="button secondary cms-upload-button"><ImageSquare size={18} />更换本机图片<input type="file" accept="image/*" onChange={uploadCover} /></label><small>JPG、PNG、WebP，单张不超过 5MB</small></div>
            <InputField label="图片替代文字" hint="用于无障碍阅读和图片无法加载时"><input value={draft.coverAlt || ""} onChange={(event) => update("coverAlt", event.target.value)} placeholder="简要描述图片内容" /></InputField>
          </div>
        </section>

        <section className="cms-panel cms-checklist-panel">
          <div className="cms-panel-heading compact"><div><h2>内容完整度</h2></div><strong>{completion.filter(([, done]) => done).length}/{completion.length}</strong></div>
          <div className="cms-checklist">{completion.map(([label, done]) => <div key={label} className={done ? "done" : ""}><span><Check size={14} weight="bold" /></span>{label}</div>)}</div>
          <button type="button" className="button secondary cms-full-preview" onClick={() => setPreviewOpen(true)}><Eye size={18} />查看完整前台预览</button>
        </section>

        <section className="cms-panel cms-mini-preview-panel">
          <div className="cms-panel-heading compact"><div><h2>前台实时预览</h2></div><span>内容同步更新</span></div>
          <div className="cms-mini-preview"><h3>{draft.title || "案例标题"}</h3><p>{draft.summary || "案例摘要将在这里显示。"}</p><div className="tags"><span>{draft.industry}</span><span>{draft.detector}</span><span>{draft.instrument}</span></div><CaseArticleContent item={draft} preview /></div>
        </section>
      </aside>
    </div>
    <div className="cms-mobile-savebar"><a href="#/admin/cases" className="button secondary">取消</a><button type="submit" className="button primary" disabled={saving}>{saving ? <SpinnerGap size={18} className="spin" /> : <FloppyDisk size={18} />}{saving ? "保存中" : "保存案例"}</button></div>
  </form>{previewOpen && <PreviewLayer item={draft} onClose={() => setPreviewOpen(false)} />}</div>;
}
