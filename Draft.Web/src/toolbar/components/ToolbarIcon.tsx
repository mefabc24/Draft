export type ToolbarIconName =
  | 'blockquote'
  | 'bold'
  | 'bulletList'
  | 'code'
  | 'codeBlock'
  | 'comment'
  | 'edit'
  | 'highlight'
  | 'image'
  | 'italic'
  | 'link'
  | 'noneList'
  | 'numberedList'
  | 'spoiler'
  | 'strikethrough'
  | 'taskList'
  | 'underline'

const toolbarIconPaths: Record<ToolbarIconName, string> = {
  blockquote: 'icons/Blockquote.svg',
  bold: 'icons/Bold.svg',
  bulletList: 'icons/BulletList.svg',
  code: 'icons/Code.svg',
  codeBlock: 'icons/Code%20Block.svg',
  comment: 'icons/Comment.svg',
  edit: 'icons/Edit.svg',
  highlight: 'icons/Highlight.svg',
  image: 'icons/Image.svg',
  italic: 'icons/Italic.svg',
  link: 'icons/Link.svg',
  noneList: 'icons/NoList.svg',
  numberedList: 'icons/NumberedList.svg',
  spoiler: 'icons/Spoiler.svg',
  strikethrough: 'icons/Strikethrough.svg',
  taskList: 'icons/Tasklist.svg',
  underline: 'icons/Underline.svg',
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
