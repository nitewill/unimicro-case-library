import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CaretDown, CheckCircle, DownloadSimple, Eye, FileArrowUp, FunnelSimple, MagnifyingGlass, Paperclip, PencilSimple, Plus, SpinnerGap, Trash, X } from "@phosphor-icons/react";
import { detectors, industries, instruments, officialCases, officialDatasetVersion } from "./data";
import { deleteCase, getAllCases, getApplicationRequests, saveApplicationRequest, saveCase, saveTaxonomies, seedOfficialDataset, updateApplicationRequestStatus } from "./db";
import { createBatchZip, downloadBlob, downloadCasePdf, isWeChatBrowser } from "./pdf";
import { CaseArticleContent } from "./CaseArticle";
import { CaseEditorPage } from "./CaseEditorPage";

const requestStatuses = ["待跟进", "已联系", "已关闭"];
const emptyFilters = { industry: [], detector: [], instrument: [] };
const defaultTaxonomies = { industry: industries, detector: detectors, instrument: instruments };
const batchDownloadEnabled = false;
const officialOrder = new Map(officialCases.map((item, index) => [item.id, index]));
const orderCases = (items) => [...items].sort((a, b) => (officialOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (officialOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER));

function useHashRoute() {
  const [route, setRoute] = useState(window.location.hash || "#/");
  useEffect(() => {
    const onHashChange = () => { setRoute(window.location.hash || "#/"); window.scrollTo({ top: 0, left: 0 }); };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  return route;
}

function Brand({ admin = false }) {
  return <div className="brand-lockup"><img src="/assets/unimicro-logo.png" alt="通微 UNIMICRO" /><span className="brand-divider" /><span className="brand-title">{admin ? "应用案例库 · 内容管理后台" : "通微应用案例库"}</span></div>;
}

function PublicHeader({ query, onQueryChange, onSubmitSearch, onRequest }) {
  return <header className="site-header">
    <Brand />
    <form className="header-search" onSubmit={onSubmitSearch}><MagnifyingGlass size={19} aria-hidden="true" /><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="输入样品、检测物或关键词" aria-label="搜索应用案例" /><button type="submit" className="button primary search-button">搜索应用案例</button></form>
    <button type="button" className="button request-button header-request" onClick={onRequest}>提交应用需求</button>
  </header>;
}

function FilterGroup({ title, filterKey, options, filters, onToggle, collapsible = false }) {
  const body = <div className="filter-options">{options.map((option) => <label className="filter-option" key={option}><input type="checkbox" checked={filters[filterKey].includes(option)} onChange={() => onToggle(filterKey, option)} /><span className="filter-label">{option}</span></label>)}</div>;
  if (collapsible) {
    const selectedCount = filters[filterKey].length;
    return <details className="mobile-filter-group" open={filterKey === "industry"}><summary><span>{title}{selectedCount ? `（${selectedCount}）` : ""}</span><CaretDown size={17} aria-hidden="true" /></summary>{body}</details>;
  }
  return <section className="desktop-filter-group"><h2>{title}<CaretDown size={17} aria-hidden="true" /></h2>{body}</section>;
}

function DesktopFilters({ filters, onToggle, taxonomies }) {
  return <aside className="desktop-filters" aria-label="案例筛选"><FilterGroup title="应用行业" filterKey="industry" options={taxonomies.industry} {...{ filters, onToggle }} /><FilterGroup title="检测器" filterKey="detector" options={taxonomies.detector} {...{ filters, onToggle }} /><FilterGroup title="仪器" filterKey="instrument" options={taxonomies.instrument} {...{ filters, onToggle }} /></aside>;
}

function MobileFilters({ filters, onToggle, onClear, taxonomies }) {
  const selectedCount = Object.values(filters).flat().length;
  return <section className="mobile-filters"><div className="mobile-filter-head"><span><FunnelSimple size={18} />筛选条件（{selectedCount}）</span><button type="button" className="text-button" onClick={onClear}>清除筛选</button></div><FilterGroup collapsible title="应用行业" filterKey="industry" options={taxonomies.industry} {...{ filters, onToggle }} /><FilterGroup collapsible title="检测器" filterKey="detector" options={taxonomies.detector} {...{ filters, onToggle }} /><FilterGroup collapsible title="仪器" filterKey="instrument" options={taxonomies.instrument} {...{ filters, onToggle }} /></section>;
}

function CaseCard({ item, selected, onSelect, onDetail, onDownload, downloading, showSelection }) {
  return <article className={`case-card${showSelection && selected ? " selected" : ""}`}>
    <button type="button" className="case-card-open" onClick={() => onDetail(item)} aria-label={`查看案例详情：${item.title}`} />
    {showSelection && <label className="case-select" title={selected ? "取消选择" : "选择此案例"}><input type="checkbox" checked={selected} onChange={() => onSelect(item.id)} aria-label={`选择 ${item.title}`} /></label>}
    <div className="case-image-wrap"><img src={item.image} alt={`${item.instrument}仪器配置`} className="case-image" /></div>
    <div className="case-card-body"><h2>{item.title}</h2><p>{item.summary}</p><div className="tags" aria-label="案例标签"><span>{item.industry}</span><span>{item.detector}</span><span>{item.instrument}</span></div><div className="card-actions"><button type="button" className="link-action" onClick={() => onDetail(item)}>查看详情 <ArrowRight size={17} weight="bold" /></button><button type="button" className="link-action" disabled={downloading} onClick={() => onDownload(item)}>{downloading ? <SpinnerGap size={17} className="spin" /> : <DownloadSimple size={17} weight="bold" />} {downloading ? "正在生成" : "下载 PDF"}</button></div></div>
  </article>;
}

function EmptyState({ onClear }) {
  return <div className="empty-state"><MagnifyingGlass size={38} /><h2>没有找到匹配的应用案例</h2><p>请尝试减少筛选条件，或提交样品与检测目标。</p><button type="button" className="button secondary" onClick={onClear}>清空筛选</button></div>;
}

function CaseDetail({ item, onClose, onDownload, downloading }) {
  if (!item) return null;
  return <div className="modal-layer" role="dialog" aria-modal="true" aria-label="应用案例详情"><button type="button" className="modal-scrim" onClick={onClose} aria-label="关闭详情" /><article className="detail-modal"><div className="modal-heading"><div><span className="eyebrow">应用案例详情</span><h2>{item.title}</h2></div><button type="button" className="icon-button" onClick={onClose} title="关闭"><X size={23} /></button></div><CaseArticleContent item={item} /><div className="detail-footer"><span>{item.contact}</span><button type="button" className="button primary" disabled={downloading} onClick={() => onDownload(item)}>{downloading ? <SpinnerGap size={18} className="spin" /> : <DownloadSimple size={18} />} {downloading ? "正在生成" : "下载完整 PDF"}</button></div></article></div>;
}

const requiredFields = ["name", "organization", "contact", "industry", "sample", "description"];

function ApplicationRequestModal({ open, onClose, onSuccess }) {
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [attachment, setAttachment] = useState(null);
  if (!open) return null;
  const submit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextErrors = {};
    requiredFields.forEach((field) => { if (!String(form.get(field) || "").trim()) nextErrors[field] = "请填写此项"; });
    if (!form.get("privacy")) nextErrors.privacy = "请确认隐私说明";
    if (attachment && attachment.size > 20 * 1024 * 1024) nextErrors.attachment = "附件不能超过 20MB";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSaving(true);
    try {
      await saveApplicationRequest({ name: form.get("name").trim(), organization: form.get("organization").trim(), contact: form.get("contact").trim(), email: form.get("email").trim(), industry: form.get("industry"), sample: form.get("sample").trim(), detector: form.get("detector"), instrument: form.get("instrument"), description: form.get("description").trim(), attachment: attachment ? { name: attachment.name, type: attachment.type, size: attachment.size, file: attachment } : null });
      onClose(); onSuccess();
    } catch (error) { setErrors({ submit: error instanceof Error ? error.message : "保存失败，请重试" }); }
    finally { setSaving(false); }
  };
  return <div className="modal-layer request-modal-layer" role="dialog" aria-modal="true" aria-label="提交应用需求"><button type="button" className="modal-scrim" onClick={onClose} aria-label="关闭表单" /><section className="request-modal"><div className="modal-heading request-heading"><button type="button" className="mobile-back icon-button" onClick={onClose} title="返回"><ArrowLeft size={23} /></button><div><h2>提交应用需求</h2><p>告诉我们您的样品与检测目标，应用工程师将尽快联系您</p></div><button type="button" className="icon-button" onClick={onClose} title="关闭"><X size={23} /></button></div><form className="request-form" onSubmit={submit} noValidate><div className="request-form-scroll"><div className="form-grid"><FormField label="姓名" name="name" required error={errors.name} placeholder="请输入姓名" /><FormField label="单位" name="organization" required error={errors.organization} placeholder="请输入单位名称" /><FormField label="手机/微信" name="contact" required error={errors.contact} placeholder="请输入手机号或微信号" /><FormField label="邮箱" name="email" type="email" placeholder="请输入邮箱地址" /><SelectField label="应用行业" name="industry" required error={errors.industry} options={industries} /><FormField label="样品/检测物" name="sample" required error={errors.sample} placeholder="请输入样品或检测物名称" /><SelectField label="期望检测器" name="detector" options={detectors} /><SelectField label="期望仪器" name="instrument" options={instruments} /><label className="field field-wide"><span>需求说明 <em>*</em></span><textarea name="description" maxLength="1000" placeholder="请详细描述样品信息、检测目标、检测难点、预期结果等（1000字以内）" aria-invalid={Boolean(errors.description)} />{errors.description && <small className="field-error">{errors.description}</small>}</label><label className="field field-wide attachment-field"><span>添加附件（可选）</span><span className="attachment-drop"><FileArrowUp size={23} /><strong>{attachment ? attachment.name : "点击选择文件上传"}</strong><small>支持 PDF、Word、Excel、图片等格式，单个文件不超过 20MB</small><input type="file" onChange={(event) => setAttachment(event.target.files?.[0] || null)} /></span>{errors.attachment && <small className="field-error">{errors.attachment}</small>}</label></div><label className="privacy-check"><input type="checkbox" name="privacy" /><span>我已阅读并同意隐私说明，仅授权用于本次需求沟通</span></label>{errors.privacy && <small className="field-error standalone-error">{errors.privacy}</small>}<div className="demo-notice">演示数据仅保存在当前浏览器，不会实际发送</div>{errors.submit && <div className="form-submit-error">{errors.submit}</div>}</div><div className="request-form-actions"><button type="button" className="button secondary" onClick={onClose}>取消</button><button type="submit" className="button primary" disabled={saving}>{saving && <SpinnerGap size={18} className="spin" />} {saving ? "正在保存" : "提交应用需求"}</button></div></form></section></div>;
}

function FormField({ label, name, required, error, type = "text", placeholder, defaultValue }) {
  return <label className="field"><span>{label} {required && <em>*</em>}</span><input name={name} type={type} placeholder={placeholder} aria-invalid={Boolean(error)} defaultValue={defaultValue} />{error && <small className="field-error">{error}</small>}</label>;
}
function SelectField({ label, name, required, error, options }) {
  return <label className="field"><span>{label} {required && <em>*</em>}</span><select name={name} defaultValue="" aria-invalid={Boolean(error)}><option value="">请选择{label}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>{error && <small className="field-error">{error}</small>}</label>;
}

function PublicLibrary() {
  const [cases, setCases] = useState(officialCases); const [taxonomies, setTaxonomies] = useState(defaultTaxonomies); const [filters, setFilters] = useState(emptyFilters); const [query, setQuery] = useState(""); const [selected, setSelected] = useState(() => new Set()); const [requestOpen, setRequestOpen] = useState(false); const [detail, setDetail] = useState(null); const [toast, setToast] = useState(""); const [downloadingId, setDownloadingId] = useState(null); const [batchState, setBatchState] = useState({ running: false, current: 0, total: 0, failures: [] });
  useEffect(() => { seedOfficialDataset(officialCases, defaultTaxonomies, officialDatasetVersion).then(({ cases: items, taxonomies: groups }) => { setCases(orderCases(items)); setTaxonomies(groups); }).catch(() => { setCases(officialCases); setTaxonomies(defaultTaxonomies); }); }, []);
  useEffect(() => { if (!toast) return undefined; const timer = window.setTimeout(() => setToast(""), 3600); return () => window.clearTimeout(timer); }, [toast]);
  const filtered = useMemo(() => { const normalized = query.trim().toLowerCase(); return cases.filter((item) => { const matchesFilter = Object.entries(filters).every(([key, values]) => !values.length || values.includes(item[key])); const haystack = [item.title, item.summary, item.industry, item.detector, item.instrument, item.background, item.standardReference, item.result, item.contentHtml?.replace(/<[^>]*>/g, " ")].join(" ").toLowerCase(); return matchesFilter && (!normalized || haystack.includes(normalized)); }); }, [cases, filters, query]);
  const selectedCases = cases.filter((item) => selected.has(item.id));
  const allFilteredSelected = filtered.length > 0 && filtered.every((item) => selected.has(item.id));
  const toggleFilter = (key, value) => setFilters((current) => ({ ...current, [key]: current[key].includes(value) ? current[key].filter((item) => item !== value) : [...current[key], value] }));
  const clearFilters = () => { setFilters(emptyFilters); setQuery(""); };
  const toggleSelected = (id) => setSelected((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const toggleAllFiltered = () => setSelected((current) => { const next = new Set(current); if (allFilteredSelected) filtered.forEach((item) => next.delete(item.id)); else filtered.forEach((item) => next.add(item.id)); return next; });
  const handleSingleDownload = async (item) => { if (downloadingId) return; setDownloadingId(item.id); try { await downloadCasePdf(item); setToast("PDF 已生成并开始下载"); } catch (error) { setToast(`PDF 生成失败：${error instanceof Error ? error.message : "请重试"}`); } finally { setDownloadingId(null); } };
  const handleBatchDownload = async () => {
    if (batchState.running || !selectedCases.length) return;
    if (isWeChatBrowser()) { setToast("微信内置浏览器暂不支持 ZIP 下载，请在右上角选择在浏览器中打开后下载"); return; }
    setBatchState({ running: true, current: 0, total: selectedCases.length, failures: [] });
    try { const result = await createBatchZip(selectedCases, (progress) => setBatchState({ running: true, ...progress })); downloadBlob(result.blob, result.filename); setToast(result.failures.length ? `批量下载完成，${result.failures.map((item) => item.title).join("、")} 生成失败，可重试` : `已生成 ${selectedCases.length} 份 PDF 并打包下载`); setBatchState((current) => ({ ...current, running: false, failures: result.failures })); }
    catch (error) { setToast(`批量下载失败：${error instanceof Error ? error.message : "请重试"}`); setBatchState((current) => ({ ...current, running: false })); }
  };
  return <div className={`public-shell${batchDownloadEnabled && selected.size ? " has-mobile-batch" : ""}`}>
    <PublicHeader query={query} onQueryChange={setQuery} onSubmitSearch={(event) => event.preventDefault()} onRequest={() => setRequestOpen(true)} />
    <button type="button" className="button request-button mobile-request" onClick={() => setRequestOpen(true)}>提交应用需求</button>
    <div className="library-layout">
      <DesktopFilters filters={filters} onToggle={toggleFilter} taxonomies={taxonomies} />
      <main className="results-area">
        <MobileFilters filters={filters} onToggle={toggleFilter} onClear={clearFilters} taxonomies={taxonomies} />
        <div className="results-toolbar">
          <strong>共 {filtered.length} 个结果</strong>
          {batchDownloadEnabled && <div className="selection-tools"><label><input type="checkbox" checked={allFilteredSelected} onChange={toggleAllFiltered} />全选当前结果</label><button type="button" className="text-button" onClick={() => setSelected(new Set())} disabled={!selected.size}>清空选择</button><button type="button" className="button primary batch-button" disabled={!selected.size || batchState.running} onClick={handleBatchDownload}>{batchState.running ? <SpinnerGap size={18} className="spin" /> : <DownloadSimple size={18} />}{batchState.running ? `正在生成 ${batchState.current}/${batchState.total}` : `批量下载 PDF${selected.size ? `（${selected.size}）` : ""}`}</button></div>}
        </div>
        {batchDownloadEnabled && batchState.failures.length > 0 && !batchState.running && <div className="batch-error">以下案例生成失败：{batchState.failures.map((item) => item.title).join("、")}。请保留选择后重试。</div>}
        {filtered.length ? <div className="case-grid">{filtered.map((item) => <CaseCard key={item.id} item={item} selected={selected.has(item.id)} onSelect={toggleSelected} onDetail={setDetail} onDownload={handleSingleDownload} downloading={downloadingId === item.id} showSelection={batchDownloadEnabled} />)}</div> : <EmptyState onClear={clearFilters} />}
      </main>
    </div>
    {batchDownloadEnabled && selected.size > 0 && <div className="mobile-batch-bar"><strong>已选 {selected.size} 项</strong><button type="button" className="text-button" onClick={() => setSelected(new Set())}>清空</button><button type="button" className="button primary" disabled={batchState.running} onClick={handleBatchDownload}>{batchState.running ? <SpinnerGap size={18} className="spin" /> : <DownloadSimple size={18} />}{batchState.running ? `${batchState.current}/${batchState.total}` : "批量下载 PDF"}</button></div>}
    <ApplicationRequestModal open={requestOpen} onClose={() => setRequestOpen(false)} onSuccess={() => setToast("提交成功，我们会尽快与您联系")} />
    <CaseDetail item={detail} onClose={() => setDetail(null)} onDownload={handleSingleDownload} downloading={detail ? downloadingId === detail.id : false} />
    {toast && <div className="toast" role="status"><CheckCircle size={21} weight="fill" />{toast}</div>}
  </div>;
}

function AdminHeader({ active }) {
  return <><header className="admin-header"><Brand admin /><a href="#/" className="button secondary">返回案例库</a></header><nav className="admin-nav" aria-label="后台导航"><a className={active === "cases" ? "active" : ""} href="#/admin/cases">案例管理</a><a className={active === "taxonomies" ? "active" : ""} href="#/admin/taxonomies">分类设置</a><a className={active === "requests" ? "active" : ""} href="#/admin/requests">应用需求</a></nav></>;
}

function AdminRequests() {
  const [requests, setRequests] = useState([]); const [selected, setSelected] = useState(null); const [loading, setLoading] = useState(true);
  const reload = () => getApplicationRequests().then(setRequests).finally(() => setLoading(false));
  useEffect(() => { reload(); }, []);
  const changeStatus = async (request, status) => { await updateApplicationRequestStatus(request.id, status); await reload(); setSelected((current) => current?.id === request.id ? { ...current, status } : current); };
  return <div className="admin-shell"><AdminHeader active="requests" /><main className="admin-main"><div className="admin-title-row"><div><span className="eyebrow">本机演示数据</span><h1>应用需求</h1><p>需求与附件仅保存在当前浏览器中。</p></div><span className="admin-count">{requests.length} 条需求</span></div><div className="admin-table-wrap">{loading ? <div className="admin-empty">正在读取本机数据…</div> : requests.length ? <table className="admin-table"><thead><tr><th>提交时间</th><th>联系人</th><th>单位</th><th>应用行业</th><th>样品/检测物</th><th>状态</th><th>操作</th></tr></thead><tbody>{requests.map((request) => <tr key={request.id}><td>{new Date(request.createdAt).toLocaleString("zh-CN", { hour12: false })}</td><td><strong>{request.name}</strong><small>{request.contact}</small></td><td>{request.organization}</td><td>{request.industry}</td><td>{request.sample}</td><td><select className={`status-select status-${request.status}`} value={request.status} onChange={(event) => changeStatus(request, event.target.value)}>{requestStatuses.map((status) => <option value={status} key={status}>{status}</option>)}</select></td><td><button type="button" className="link-action" onClick={() => setSelected(request)}><Eye size={17} />查看详情</button></td></tr>)}</tbody></table> : <div className="admin-empty"><Paperclip size={34} /><h2>暂无应用需求</h2><p>在公开页面提交一条演示需求后，可在这里查看和跟进。</p></div>}</div></main>{selected && <RequestDetail request={selected} onClose={() => setSelected(null)} onStatusChange={(status) => changeStatus(selected, status)} />}</div>;
}

function RequestDetail({ request, onClose, onStatusChange }) {
  return <div className="drawer-layer" role="dialog" aria-modal="true" aria-label="应用需求详情"><button type="button" className="modal-scrim" onClick={onClose} aria-label="关闭详情" /><aside className="request-detail-drawer"><div className="modal-heading"><div><span className="eyebrow">应用需求详情</span><h2>{request.sample}</h2></div><button type="button" className="icon-button" onClick={onClose}><X size={23} /></button></div><div className="drawer-status"><span>跟进状态</span><select className={`status-select status-${request.status}`} value={request.status} onChange={(event) => onStatusChange(event.target.value)}>{requestStatuses.map((status) => <option value={status} key={status}>{status}</option>)}</select></div><dl className="request-detail-list"><div><dt>提交时间</dt><dd>{new Date(request.createdAt).toLocaleString("zh-CN", { hour12: false })}</dd></div><div><dt>姓名</dt><dd>{request.name}</dd></div><div><dt>单位</dt><dd>{request.organization}</dd></div><div><dt>手机/微信</dt><dd>{request.contact}</dd></div><div><dt>邮箱</dt><dd>{request.email || "未填写"}</dd></div><div><dt>应用行业</dt><dd>{request.industry}</dd></div><div><dt>样品/检测物</dt><dd>{request.sample}</dd></div><div><dt>期望检测器</dt><dd>{request.detector || "未指定"}</dd></div><div><dt>期望仪器</dt><dd>{request.instrument || "未指定"}</dd></div><div className="wide"><dt>需求说明</dt><dd>{request.description}</dd></div><div className="wide"><dt>附件</dt><dd>{request.attachment ? `${request.attachment.name}（${(request.attachment.size / 1024 / 1024).toFixed(2)} MB）` : "无附件"}</dd></div></dl><div className="demo-notice">演示数据仅保存在当前浏览器，不会实际发送</div></aside></div>;
}

const taxonomyMeta = {
  industry: { title: "应用行业", description: "用于客户按样品所属行业筛选案例", placeholder: "例如：临床检验" },
  detector: { title: "检测器", description: "包含液相及毛细管电泳相关检测器", placeholder: "例如：CAD 电雾式检测器" },
  instrument: { title: "仪器", description: "包含液相色谱与毛细管电泳仪器", placeholder: "例如：新型号仪器名称" },
};

function TaxonomyAdmin() {
  const [taxonomies, setTaxonomies] = useState(defaultTaxonomies);
  const [savedTaxonomies, setSavedTaxonomies] = useState(defaultTaxonomies);
  const [cases, setCases] = useState([]);
  const [newValues, setNewValues] = useState({ industry: "", detector: "", instrument: "" });
  const [notice, setNotice] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    seedOfficialDataset(officialCases, defaultTaxonomies, officialDatasetVersion).then(({ taxonomies: groups, cases: items }) => {
      const cloned = Object.fromEntries(Object.entries(groups).map(([key, values]) => [key, [...values]]));
      setTaxonomies(cloned); setSavedTaxonomies(cloned); setCases(items);
    }).finally(() => setLoading(false));
  }, []);

  const updateDraft = (group, index, value) => setTaxonomies((current) => ({ ...current, [group]: current[group].map((item, itemIndex) => itemIndex === index ? value : item) }));
  const persist = async (next, message) => {
    await saveTaxonomies(next);
    const cloned = Object.fromEntries(Object.entries(next).map(([key, values]) => [key, [...values]]));
    setTaxonomies(cloned); setSavedTaxonomies(cloned); setNotice(message);
  };
  const hasDuplicate = (group, value, exceptIndex = -1) => savedTaxonomies[group].some((item, index) => index !== exceptIndex && item.toLowerCase() === value.toLowerCase());
  const addValue = async (group) => {
    const value = newValues[group].trim();
    if (!value) { setNotice(`请输入${taxonomyMeta[group].title}名称`); return; }
    if (hasDuplicate(group, value)) { setNotice(`“${value}”已经存在，无需重复添加`); return; }
    const next = { ...savedTaxonomies, [group]: [...savedTaxonomies[group], value] };
    await persist(next, `已新增${taxonomyMeta[group].title}“${value}”`);
    setNewValues((current) => ({ ...current, [group]: "" }));
  };
  const renameValue = async (group, index) => {
    const oldValue = savedTaxonomies[group][index];
    const value = taxonomies[group][index].trim();
    if (!value) { setNotice("分类名称不能为空"); updateDraft(group, index, oldValue); return; }
    if (value === oldValue) { setNotice("分类名称没有变化"); return; }
    if (hasDuplicate(group, value, index)) { setNotice(`“${value}”已经存在，请使用其他名称`); return; }
    const changedCases = cases.filter((item) => item[group] === oldValue).map((item) => ({ ...item, [group]: value, updatedAt: new Date().toISOString() }));
    await Promise.all(changedCases.map(saveCase));
    const next = { ...savedTaxonomies, [group]: savedTaxonomies[group].map((item, itemIndex) => itemIndex === index ? value : item) };
    await persist(next, changedCases.length ? `已改名，并同步更新 ${changedCases.length} 个案例` : "分类名称已更新");
    if (changedCases.length) setCases((current) => current.map((item) => item[group] === oldValue ? { ...item, [group]: value } : item));
  };
  const deleteValue = async (group, index) => {
    const value = savedTaxonomies[group][index];
    const usage = cases.filter((item) => item[group] === value).length;
    if (usage) { setNotice(`“${value}”正在被 ${usage} 个案例使用，请先修改这些案例后再删除`); return; }
    setPendingDelete({ group, index, value });
  };
  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const { group, index, value } = pendingDelete;
    const next = { ...savedTaxonomies, [group]: savedTaxonomies[group].filter((_, itemIndex) => itemIndex !== index) };
    setPendingDelete(null);
    await persist(next, `已删除${taxonomyMeta[group].title}“${value}”`);
  };
  const moveValue = async (group, index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= savedTaxonomies[group].length) return;
    const values = [...savedTaxonomies[group]];
    [values[index], values[target]] = [values[target], values[index]];
    await persist({ ...savedTaxonomies, [group]: values }, "分类顺序已更新，前台筛选同步生效");
  };

  return <div className="admin-shell"><AdminHeader active="taxonomies" /><main className="admin-main"><div className="admin-title-row"><div><span className="eyebrow">筛选与案例属性</span><h1>分类设置</h1><p>新增、改名或调整顺序后，案例编辑页和前台筛选会同步更新。</p></div><span className="admin-count">3 类筛选项</span></div>{notice && <div className="cms-alert taxonomy-notice"><span>{notice}</span><button type="button" className="text-button" onClick={() => setNotice("")}>关闭</button></div>}{loading ? <div className="admin-empty">正在读取分类设置…</div> : <div className="taxonomy-grid">{Object.entries(taxonomyMeta).map(([group, meta]) => <section className="taxonomy-panel" key={group}><header><div><h2>{meta.title}</h2><p>{meta.description}</p></div><span>{savedTaxonomies[group].length} 项</span></header><div className="taxonomy-add"><input value={newValues[group]} placeholder={meta.placeholder} onChange={(event) => setNewValues((current) => ({ ...current, [group]: event.target.value }))} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addValue(group); } }} /><button type="button" className="button primary" onClick={() => addValue(group)}><Plus size={17} />新增</button></div><div className="taxonomy-list">{taxonomies[group].map((value, index) => { const savedValue = savedTaxonomies[group][index]; const usage = cases.filter((item) => item[group] === savedValue).length; const changed = value.trim() !== savedValue; return <div className="taxonomy-row" key={`${savedValue}-${index}`}><span className="taxonomy-order">{String(index + 1).padStart(2, "0")}</span><div className="taxonomy-name"><input value={value} onChange={(event) => updateDraft(group, index, event.target.value)} /><small>{usage ? `${usage} 个案例正在使用` : "暂无案例使用"}</small></div><div className="taxonomy-actions"><button type="button" className="icon-button" disabled={!index} onClick={() => moveValue(group, index, -1)} title="上移"><ArrowUp size={17} /></button><button type="button" className="icon-button" disabled={index === taxonomies[group].length - 1} onClick={() => moveValue(group, index, 1)} title="下移"><ArrowDown size={17} /></button>{changed && <button type="button" className="taxonomy-save-name" onClick={() => renameValue(group, index)}>保存名称</button>}<button type="button" className="icon-button danger-icon" onClick={() => deleteValue(group, index)} title={usage ? `已有 ${usage} 个案例使用` : "删除"}><Trash size={18} /></button></div></div>; })}</div></section>)}</div>}</main>{pendingDelete && <div className="modal-layer taxonomy-confirm-layer" role="dialog" aria-modal="true" aria-label="确认删除分类"><button type="button" className="modal-scrim" onClick={() => setPendingDelete(null)} aria-label="取消删除" /><section className="taxonomy-confirm"><div className="modal-heading"><div><span className="eyebrow">删除分类</span><h2>确认删除“{pendingDelete.value}”吗？</h2></div><button type="button" className="icon-button" onClick={() => setPendingDelete(null)}><X size={22} /></button></div><p>删除后将不再出现在案例编辑页和前台筛选中。</p><div className="request-form-actions"><button type="button" className="button secondary" onClick={() => setPendingDelete(null)}>取消</button><button type="button" className="button taxonomy-delete-confirm" onClick={confirmDelete}><Trash size={17} />确认删除</button></div></section></div>}</div>;
}

function AdminCases() {
  const [cases, setCases] = useState([]);
  const reload = () => getAllCases().then((items) => setCases(orderCases(items)));
  useEffect(() => { seedOfficialDataset(officialCases, defaultTaxonomies, officialDatasetVersion).then(({ cases: items }) => setCases(orderCases(items))); }, []);
  const remove = async (item) => { if (!window.confirm(`确认删除“${item.title}”吗？`)) return; await deleteCase(item.id); reload(); };
  return <div className="admin-shell"><AdminHeader active="cases" /><main className="admin-main"><div className="admin-title-row"><div><span className="eyebrow">官网真实案例</span><h1>案例管理</h1><p>当前收录20篇真实应用案例，编辑后会同步到前台详情与PDF。</p></div><a className="button primary" href="#/admin/cases/new"><Plus size={18} />新增案例</a></div><div className="admin-case-list">{cases.map((item) => <article key={item.id} className="admin-case-row"><img src={item.image} alt="" /><div><h2>{item.title}</h2><p>{item.summary}</p><div className="tags"><span>{item.industry}</span><span>{item.detector}</span><span>{item.instrument}</span></div></div><div className="admin-row-actions"><a className="icon-button" title="编辑案例" aria-label={`编辑 ${item.title}`} href={`#/admin/cases/edit/${encodeURIComponent(item.id)}`}><PencilSimple size={20} /></a><button type="button" className="icon-button danger-icon" title="删除案例" onClick={() => remove(item)}><Trash size={20} /></button></div></article>)}</div></main></div>;
}

export function App() { const route = useHashRoute(); if (route === "#/admin/cases/new") return <CaseEditorPage key="new-case" />; if (route.startsWith("#/admin/cases/edit/")) { const caseId = decodeURIComponent(route.slice("#/admin/cases/edit/".length)); return <CaseEditorPage key={caseId} caseId={caseId} />; } if (route.startsWith("#/admin/taxonomies")) return <TaxonomyAdmin />; if (route.startsWith("#/admin/requests")) return <AdminRequests />; if (route.startsWith("#/admin")) return <AdminCases />; return <PublicLibrary />; }
