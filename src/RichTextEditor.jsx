import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import DOMPurify from "dompurify";
import {
  ArrowClockwise,
  ArrowCounterClockwise,
  Columns,
  ImageSquare,
  LinkSimple,
  ListBullets,
  ListNumbers,
  Quotes,
  Rows,
  Table,
  TextAlignCenter,
  TextAlignLeft,
  TextAlignRight,
  TextB,
  TextHOne,
  TextHTwo,
  TextItalic,
  TextUnderline,
  Trash,
} from "@phosphor-icons/react";

const MAX_EDITOR_IMAGE_SIZE = 5 * 1024 * 1024;

function ToolbarButton({ active = false, disabled = false, title, onClick, children }) {
  return <button type="button" className={`editor-tool${active ? " active" : ""}`} disabled={disabled} title={title} aria-label={title} onClick={onClick}>{children}</button>;
}

export function RichContent({ html, className = "" }) {
  if (!html) return null;
  const cleanHtml = DOMPurify.sanitize(html, { ADD_ATTR: ["target"] });
  return <div className={`rich-content ${className}`.trim()} dangerouslySetInnerHTML={{ __html: cleanHtml }} />;
}

export function RichTextEditor({ value, onChange, onImageError }) {
  const fileInputRef = useRef(null);
  const [tableOpen, setTableOpen] = useState(false);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, defaultProtocol: "https" },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image.configure({ allowBase64: true, HTMLAttributes: { class: "case-article-image" } }),
      TableKit.configure({ table: { resizable: true, HTMLAttributes: { class: "case-article-table" } } }),
    ],
    content: value || "<p></p>",
    editorProps: {
      attributes: {
        class: "rich-editor-content",
        "aria-label": "案例正文编辑区",
      },
    },
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getHTML()),
  });

  useEffect(() => {
    if (!editor || editor.getHTML() === (value || "<p></p>")) return;
    editor.commands.setContent(value || "<p></p>", { emitUpdate: false });
  }, [editor, value]);

  if (!editor) return <div className="rich-editor-loading">正在加载正文编辑器…</div>;

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href || "";
    const url = window.prompt("请输入链接地址", previousUrl);
    if (url === null) return;
    if (!url.trim()) editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  const insertImage = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { onImageError?.("请选择 JPG、PNG、WebP 等图片文件"); return; }
    if (file.size > MAX_EDITOR_IMAGE_SIZE) { onImageError?.("正文图片不能超过 5MB"); return; }
    const reader = new FileReader();
    reader.onload = () => editor.chain().focus().setImage({ src: String(reader.result), alt: file.name, title: file.name }).run();
    reader.onerror = () => onImageError?.("图片读取失败，请重试");
    reader.readAsDataURL(file);
  };

  const inTable = editor.isActive("table");
  return <div className="rich-editor-shell">
    <div className="rich-editor-toolbar" role="toolbar" aria-label="正文格式工具">
      <div className="editor-tool-group">
        <ToolbarButton title="正文" active={editor.isActive("paragraph")} onClick={() => editor.chain().focus().setParagraph().run()}><span className="tool-text">正文</span></ToolbarButton>
        <ToolbarButton title="二级标题" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><TextHOne size={18} /></ToolbarButton>
        <ToolbarButton title="三级标题" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><TextHTwo size={18} /></ToolbarButton>
      </div>
      <div className="editor-tool-group">
        <ToolbarButton title="粗体" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><TextB size={18} /></ToolbarButton>
        <ToolbarButton title="斜体" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><TextItalic size={18} /></ToolbarButton>
        <ToolbarButton title="下划线" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}><TextUnderline size={18} /></ToolbarButton>
        <ToolbarButton title="插入或编辑链接" active={editor.isActive("link")} onClick={setLink}><LinkSimple size={18} /></ToolbarButton>
      </div>
      <div className="editor-tool-group">
        <ToolbarButton title="无序列表" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><ListBullets size={18} /></ToolbarButton>
        <ToolbarButton title="有序列表" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListNumbers size={18} /></ToolbarButton>
        <ToolbarButton title="引用" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quotes size={18} /></ToolbarButton>
      </div>
      <div className="editor-tool-group">
        <ToolbarButton title="左对齐" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}><TextAlignLeft size={18} /></ToolbarButton>
        <ToolbarButton title="居中" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}><TextAlignCenter size={18} /></ToolbarButton>
        <ToolbarButton title="右对齐" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}><TextAlignRight size={18} /></ToolbarButton>
      </div>
      <div className="editor-tool-group editor-insert-group">
        <ToolbarButton title="插入图片" onClick={() => fileInputRef.current?.click()}><ImageSquare size={18} /></ToolbarButton>
        <div className="editor-table-tools">
          <ToolbarButton title="表格工具" active={inTable || tableOpen} onClick={() => setTableOpen((current) => !current)}><Table size={18} /></ToolbarButton>
          {tableOpen && <div className="table-tool-popover">
            <button type="button" onClick={() => { editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); setTableOpen(false); }}><Table size={17} />插入 3×3 表格</button>
            <button type="button" disabled={!inTable} onClick={() => editor.chain().focus().addRowAfter().run()}><Rows size={17} />下方新增行</button>
            <button type="button" disabled={!inTable} onClick={() => editor.chain().focus().addColumnAfter().run()}><Columns size={17} />右侧新增列</button>
            <button type="button" disabled={!inTable} onClick={() => editor.chain().focus().deleteRow().run()}><Trash size={17} />删除当前行</button>
            <button type="button" disabled={!inTable} onClick={() => editor.chain().focus().deleteColumn().run()}><Trash size={17} />删除当前列</button>
            <button type="button" disabled={!inTable} className="danger" onClick={() => { editor.chain().focus().deleteTable().run(); setTableOpen(false); }}><Trash size={17} />删除整张表</button>
          </div>}
        </div>
        <input ref={fileInputRef} className="visually-hidden" type="file" accept="image/*" onChange={insertImage} />
      </div>
      <div className="editor-tool-group editor-history-group">
        <ToolbarButton title="撤销" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><ArrowCounterClockwise size={18} /></ToolbarButton>
        <ToolbarButton title="重做" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><ArrowClockwise size={18} /></ToolbarButton>
      </div>
    </div>
    <EditorContent editor={editor} />
    <div className="rich-editor-status"><span>可直接粘贴文字，也可插入表格和本机图片</span><span>{editor.storage.characterCount?.characters?.() || editor.getText().length} 字</span></div>
  </div>;
}
