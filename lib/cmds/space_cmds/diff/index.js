import chalk from 'chalk'
import {diffJson} from 'diff'
import emojic from 'emojic'
import {omit, differenceWith, flatten} from 'lodash'
import {frame} from '../../../utils/text'
import jsonpatch from 'fast-json-patch'

const removeForDiff = [
  'sys'
]

export function getPatchesAndDiff (currModel, targetModel) {
  const deletedItems = differenceWith(targetModel, currModel, (x, y) => x.sys.id === y.sys.id)
  const patches = []
  const diff = []

  currModel.forEach(currCt => {
    const counterPart = targetModel.find(ct => ct.sys.id === currCt.sys.id)
    patches.push({
      name: currCt.name,
      patches: getPatchData(counterPart || {}, currCt)
    })
    diff.push({
      name: currCt.name,
      diff: getDiffData(counterPart || {}, currCt)
    })
  })

  deletedItems.forEach(deletedCt => {
    patches.push({
      name: deletedCt.name,
      patches: getPatchData(deletedCt, {})
    })
    diff.push({
      name: deletedCt.name,
      diff: getDiffData(deletedCt, {})
    })
  })

  return { diff, patches }
}

function cleanupModels (models) {
  return models.map(item => {
    if (typeof item === 'object') {
      if (item.fields !== undefined) {
        item.fields.map((field) => {
          // TODO change this when the immutable id feature is released
          return omit(field, ['immutableId'])
        })
      }
      return omit(item, removeForDiff)
    }
    return item
  })
}

function getDiffData (first, second) {
  let cleaned = cleanupModels([first, second])
  return diffJson(...cleaned)
}

function getPatchData (first, second) {
  let cleaned = cleanupModels([first, second])
  return normalizePatches(jsonpatch.compare(...cleaned))
}

function normalizePatches (data) {
  const result = data.map((currentPatch) => {
    // path examples to match `/fields/0` or `/fileds/-`
    if (currentPatch.op === 'remove' && currentPatch.path.match(/^\/fields\/(?:\d+|-)$/)) {
      return [
        {op: 'replace', path: `${currentPatch.path}/omitted`, value: true},
        {op: 'add', path: `${currentPatch.path}/deleted`, value: true},
        currentPatch
      ]
    }
    return currentPatch
  })
  return flatten(result)
}

export function renderDiff (diff) {
  let emptyDiff = true
  diff.forEach(ct => {
    const getDiffBoundaries = diffBoundaryContext()
    const ctLines = [ct.name + '\n']
    ct.diff.forEach((part, i, parts) => {
      const { added, removed } = part
      if (!added && !removed) {
        return null
      }
      const { before, after } = getDiffBoundaries(parts, i)
      const color = added ? 'green' : 'red'

      ctLines.push(before, chalk[color](part.value), after)
    })

    if (ctLines.length === 1) {
      return
    }
    emptyDiff = false
    frame(ctLines.filter(part => part !== null).join(''))
  })
  if (emptyDiff) {
    frame(`${emojic.sparkles}  Your content types are identical ${emojic.sparkles}`)
  }
}

function diffBoundaryContext () {
  let alreadyUsedAsBoundary = []
  return function (parts, i) {
    let partBefore = determineBoundary(parts[i - 1])
    const partAfter = determineBoundary(parts[i + 1])

    let usedAlready = alreadyUsedAsBoundary.indexOf(partBefore) >= 0
    partBefore = usedAlready ? null : partBefore
    alreadyUsedAsBoundary.push(partAfter)

    const before = partBefore ? partBefore.value.slice(-100) : partBefore
    const after = partAfter ? partAfter.value.slice(0, 100) : partAfter

    return { before, after }
  }
}

function determineBoundary (part) {
  if (part && !(part.added || part.removed)) {
    return part
  }
  // when a neighboring part is also changed, we don't want to use it as a context boundary
  return null
}