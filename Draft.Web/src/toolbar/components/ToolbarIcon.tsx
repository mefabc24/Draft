export type ToolbarIconName =
  | 'blockquote'
  | 'bold'
  | 'bulletList'
  | 'code'
  | 'codeBlock'
  | 'edit'
  | 'italic'
  | 'link'
  | 'noneList'
  | 'numberedList'
  | 'strikethrough'
  | 'taskList'

const toolbarIconPaths: Record<ToolbarIconName, string> = {
  blockquote: 'icons/Blockquote.svg',
  bold: 'icons/Bold.svg',
  bulletList: 'icons/BulletList.svg',
  code: 'icons/Code.svg',
  codeBlock: 'icons/Code%20Block.svg',
  edit: 'icons/Edit.svg',
  italic: 'icons/Italic.svg',
  link: 'icons/Link.svg',
  noneList: 'icons/NoList.svg',
  numberedList: 'icons/NumberedList.svg',
  strikethrough: 'icons/Strikethrough.svg',
  taskList: 'icons/Tasklist.svg',
}

function getToolbarIconSrc(name: ToolbarIconName) {
  return `${import.meta.env.BASE_URL}${toolbarIconPaths[name]}`
}

function ToolbarIcon({ name }: { name: ToolbarIconName }) {
  return (
    <img
      className="markdown-toolbar-asset-icon"
      src={getToolbarIconSrc(name)}
      alt=""
      aria-hidden="true"
    />
  )
}

export default ToolbarIcon
