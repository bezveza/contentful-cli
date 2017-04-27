import Table from 'cli-table2'
import wrapAnsi from 'wrap-ansi'
import figlet from 'figlet'
import chalk from 'chalk'

const MIN_COLUMNS = 40
const MAX_COLUMNS = process.stdout.columns
export const DEFAULT_COLUMNS = MAX_COLUMNS >= MIN_COLUMNS ? MAX_COLUMNS : MIN_COLUMNS

export function wrap (text, columns) {
  return wrapAnsi(text, columns || DEFAULT_COLUMNS)
}

export function frame (text, inline) {
  const width = DEFAULT_COLUMNS - 2
  const options = {
    colWidths: [width]
  }

  if (inline) {
    delete options.colWidths
  }

  const table = new Table(options)
  // Currently trims whitespace :/ - See: https://github.com/chalk/wrap-ansi/issues/9
  const wrappedText = wrap(text, width)
  table.push([wrappedText])
  return table.toString()
}

export function asciiText (text) {
  return figlet.textSync(text)
}

export function separator () {
  return chalk.dim(Array.from(Array(MAX_COLUMNS + 1)).join('═'))
}