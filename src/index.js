const vscode = require('vscode')
const DICTQuery = require('./query')
const formatter = require('./format')

let outputChannel = null
let lastHover = {
  uri: null,
  range: null,
  markdown: ''
}

const genMarkdown = function (word, translation, p) {
  if (!translation && !p) {
    return `- ${word} : 本地词库暂无结果`
  }
  return `- ${word} ${p ? '*/' + p + '/*' : ''}: ${translation.replace(/\\n/g, ' ')}`
}

async function translateTextAndShow(editor, text, range) {
  if (!text || !text.trim()) {
    vscode.window.showInformationMessage('没有选中文本或单词可翻译')
    return
  }
  const originText = formatter.cleanWord(text)
  const words = formatter.getWordArray(originText) || [originText]
  let lines = []
  lines.push(`翻译 \`${originText}\` :  `)
  for (let i = 0; i < words.length; i++) {
    let _w = words[i]
    let ret = await DICTQuery(_w)
    if (i == 0) {
      lines.push(genMarkdown(_w, ret.w, ret.p))
    } else {
      lines.push('')
      lines.push('*****')
      lines.push('')
      lines.push(genMarkdown(_w, ret.w, ret.p))
    }
  }

  // prepare hover markdown
  const markdownText = lines.join('\n')
  lastHover.uri = editor.document.uri
  lastHover.range = range
  lastHover.markdown = markdownText

  // trigger hover show (requires hover provider to return content for this range)
  await vscode.commands.executeCommand('editor.action.showHover')
}

async function init(context) {
  // hover provider that returns content only when lastHover matches position
  const hoverProvider = vscode.languages.registerHoverProvider('*', {
    provideHover(document, position) {
      try {
        if (!lastHover.uri) return
        if (document.uri.toString() !== lastHover.uri.toString()) return
        if (!lastHover.range) return
        if (!lastHover.range.contains(position)) return
        return new vscode.Hover(new vscode.MarkdownString(lastHover.markdown))
      } catch (e) {
        return
      }
    }
  })

  const disposable = vscode.commands.registerTextEditorCommand('code-translate.translateSelection', async (editor) => {
    const doc = editor.document
    const selection = editor.selection
    let text = doc.getText(selection)
    let range = selection
    if (!text || !text.trim()) {
      const wrange = doc.getWordRangeAtPosition(selection.active)
      if (!wrange) {
        vscode.window.showInformationMessage('没有选中文本或单词可翻译')
        return
      }
      text = doc.getText(wrange)
      range = wrange
    }
    await translateTextAndShow(editor, text, range)
  })

  if (context && context.subscriptions) {
    context.subscriptions.push(disposable)
    context.subscriptions.push(hoverProvider)
  }
}

module.exports = {
  init
}
