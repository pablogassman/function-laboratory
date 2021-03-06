const errorReporter = {
  report: function (error) {
    alert(error)
  }
}

function onChangeValue(event) {
  if (event.blockId == this.id) {
    checkParentConnection(this)
  }
  this.setColour(colorShow(this))
}

function onChangeFunction(event) {
  if (event.blockId == this.id) {
    checkParentConnection(this)
  }
  if (this.getParent() && blockType(this).isFunctionType()) {
    this.setCollapsed(true)
  } else {
    this.setCollapsed(false)
  }
  this.setColour(colorShow(this))
}

function onChangeList(event) {
  onChangeValue.bind(this)(event)
  if (this.workspace.isDragging()) {
    return;  // Don't change state at the start of a drag.
  }
  organizeList(this)
}


function setFunctionType(block, ...types) {
  const outputType = createType(types.slice(-1)[0]);
  const inputTypes = types.slice(0, -1).map(type => createType(type));

  inputTypes.forEach((inputType, i) => { block.inputList[i].inputType = inputType });
  block.outputType = outputType;
}

function buildFuctionBlockWith(name, functionType, cb) {
  Blockly.Blocks[name] = {
    init: function () {
      cb(this)
      this.setInputsInline(true)
      this.setOutput(true)
      this.setOnChange(onChangeFunction.bind(this))
      setFunctionType(this, ...functionType)
      this.setTooltip(blockType(this).toString())
      this.setHelpUrl("")
    },
    getReduction(...args) {
      const paramCount = this.inputList.filter(isBlockInput).length
      const stackArgs = args.reverse()
      const allArgs = Array(paramCount).fill()
        .map((_, i) => argBlock(this, i) || stackArgs.pop())
      return this.getResultBlock(...allArgs)
    },
    reduce() {
      const result = this.getReduction()
      if (result.error) {
        errorReporter.report(result.error)
      } else {
        reduceBlock(this)(result.block)
      }
    },
    generateContextMenu: function () {
      return [{
        text: "Reducir",
        callback: this.reduce.bind(this),
        enabled: !blockType(this).isFunctionType() && this.getResultBlock,
      }, ...this.__proto__.generateContextMenu.bind(this)()]
    }
  }
}

const getResultBlockDefault = function () { return { block: this } }

const buildFuctionBlock = ({ name, type, fields = [], getResultBlock = getResultBlockDefault }) =>
  buildFuctionBlockWith(name, type, block => {
    block.appendValueInput(`ARG0`).appendField(fields[0] === undefined ? name : fields[0])
    for (let index = 1; index < type.length - 1; index++) {
      const inputName = fields[index] || ""
      block.appendValueInput(`ARG${index}`).appendField(inputName)
    }
    block.getResultBlock = getResultBlock
  })

const buildInfixFuctionBlock = ([name, field], functionType) =>
  buildFuctionBlockWith(name, functionType, block => {
    block.appendValueInput("LEFT")
    block.appendValueInput("RIGHT")
      .appendField(field)
  })

function decorateInit(block, initExtension) {
  const oldInit = block.init
  function newInit() {
    oldInit.bind(this)();
    initExtension.bind(this)();
  }
  block.init = newInit
}

const reduceBlock = expandedBlock => reducedBlock => {
  // Result blocks are not editable
  reducedBlock.setEditable(false)
  reducedBlock.getChildren().forEach(child => child.setEditable(false))

  expandedBlockAsXml = Blockly.Xml.blockToDom(expandedBlock)
  reducedBlock.generateContextMenu = function () {
    return [{
      text: "Expandir",
      callback: function () {
        const restoredOldBlock = Blockly.Xml.domToBlock(expandedBlockAsXml, reducedBlock.workspace)
        replace(reducedBlock)(restoredOldBlock)
      },
      enabled: true
    }, ...reducedBlock.__proto__.generateContextMenu.bind(this)()]
  }

  replace(expandedBlock)(reducedBlock)
}

const replace = oldBlock => newBlock => {
  newBlock.initSvg()
  newBlock.moveTo(oldBlock.getRelativeToSurfaceXY())
  oldBlock.dispose()
  newBlock.render()
  newBlock.getChildren().forEach(child => {
    child.initSvg()
    child.render()
  })
}

const newListType = elementType => new ListType(createType(elementType))

const argBlock = (block, arg = 0) => {
  const input = block.getInput(`ARG${arg}`)
  return input && input.connection.targetBlock()
}

const allArgBlocks = block =>
  Array(block.inputList.length).fill().map((_, i) => argBlock(block, i))

const resultFieldValue = (block, field) => {
  const reduction = block.getReduction().block
  const value = reduction.getFieldValue(field)
  if (reduction != block) { reduction.dispose() } // Dispose intermediate result blocks
  return value
}


buildFuctionBlock({
  name: "even",
  type: ["Number", "Boolean"],
  getResultBlock: function (arg) {
    const result = resultFieldValue(arg, "NUM") % 2 == 0
    return { block: newBoolean(this.workspace, result) }
  }
})
buildFuctionBlock({
  name: "not",
  type: ["Boolean", "Boolean"],
  getResultBlock: function (arg) {
    const result = !getBooleanValue(arg)
    return { block: newBoolean(this.workspace, result) }
  }
})
buildFuctionBlock({
  name: "length",
  type: ["String", "Number"],
  getResultBlock: function (arg) {
    const result = resultFieldValue(arg, "TEXT").length
    return { block: newNumber(this.workspace, result) }
  }
})//TODO: List(Char)
buildFuctionBlock({
  name: "charAt",
  type: ["Number", "String", "String"],
  getResultBlock: function (arg0, arg1) {
    const position = resultFieldValue(arg0, "NUM")
    const string = resultFieldValue(arg1, "TEXT")
    const result = string[position]
    if (result != null) {
      return { block: newString(this.workspace, result) }
    } else {
      return ({ error: "Out of bounds position" })
    }
  }
})

buildInfixFuctionBlock(["compare", ">"], ["a", "a", "Boolean"])//TODO: Selector
buildInfixFuctionBlock(["apply", "$"], [["a", "b"], "a", "b"])

buildFuctionBlock({
  name: "id",
  type: ["a", "a"],
  getResultBlock: function (arg) {
    return { block: copyBlock(this.workspace, arg) }
  }
})
buildFuctionBlock({
  name: "composition",
  type: [["b", "c"], ["a", "b"], "a", "c"],
  fields: ["", ".", "$"],
  getResultBlock: function (f2, f1, value) {
    const innerResult = f1.getReduction(value).block
    const result = f2.getReduction(innerResult)
    innerResult.dispose() // Dispose intermediate result blocks
    return result
  }
})

buildInfixFuctionBlock(["at", "!!"], [newListType("a"), "Number", "a"])
buildFuctionBlock({
  name: "any",
  type: [["a", "Boolean"], newListType("a"), "Boolean"],
  getResultBlock: function (condition, list) {
    const result = allListElements(list).some(e => {
      const booleanBlock = condition.getReduction(e).block
      const bul = getBooleanValue(booleanBlock)
      booleanBlock.dispose() // Dispose intermediate result blocks
      return bul
    })
    return { block: newBoolean(this.workspace, result) }
  }
})
buildFuctionBlock({
  name: "all",
  type: [["a", "Boolean"], newListType("a"), "Boolean"]
})
buildFuctionBlock({
  name: "filter",
  type: [["a", "Boolean"],
  newListType("a"),
  newListType("a")]
})
buildFuctionBlock({
  name: "map",
  type: [["a", "b"], newListType("a"), newListType("b")],
  getResultBlock: function (transform, list) {
    const result = allListElements(list).map(e => transform.getReduction(e).block)
    return { block: newList(this.workspace, result) }
  }
})
buildFuctionBlock({
  name: "maximum",
  type: [newListType("a"), "a"]
})
buildFuctionBlock({
  name: "minimum",
  type: [newListType("a"), "a"]
})
buildFuctionBlock({
  name: "fold",
  type: [["a", "b", "a"], "a", newListType("b"), "a"]
})

Blockly.Blocks['list'] = {
  init: function () {
    this.appendValueInput("ELEMENT")
      .appendField("[")
      .inputType = createType("a")
    this.appendDummyInput("CLOSE")
      .appendField("]")
    this.setInputsInline(true)
    this.setOutput(true, null)
    this.setTooltip("")
    this.setHelpUrl("")
    this.setOnChange(function (event) { onChangeList.bind(this)(event) })
    this.outputType = new ListType(createType("a"))
    this.inputIndex = 1
  },

  /**
   * Create XML to represent the (non-editable) name and arguments.
   * @return {!Element} XML storage element.
   * @this Blockly.Block
   */
  mutationToDom: function () {
    var container = document.createElement('mutation')
    this.inputList.filter(isBlockInput).forEach(input => {
      var parameter = document.createElement('arg')
      parameter.setAttribute('name', input.name)
      container.appendChild(parameter)
    })
    return container
  },

  /**
   * Parse XML to restore the (non-editable) name and parameters.
   * @param {!Element} xmlElement XML storage element.
   * @this Blockly.Block
   */
  domToMutation: function (xmlElement) {
    this.inputList.forEach(removeInput(this))

    for (var i = 0, childNode; childNode = xmlElement.childNodes[i]; i++) {
      if (childNode.nodeName.toLowerCase() == 'arg') {
        const inputName = childNode.getAttribute('name')
        appendNewInputList(this, inputName)
      }
    }
  },
}


Blockly.Blocks["math_arithmetic"].onchange = function (event) {
  setFunctionType(this, "Number", "Number", "Number")
  onChangeFunction.bind(this)(event)
}

function decorateValueBlock(name, type) {
  Blockly.Blocks[name].onchange = function (event) { onChangeValue.bind(this)(event) }
  Blockly.Blocks[name].outputType = createType(type)
  decorateInit(Blockly.Blocks[name], function () {
    this.getResultBlock = getResultBlockDefault
    this.getReduction = getResultBlockDefault
  })
}

decorateValueBlock("math_number", "Number")
decorateValueBlock("text", "String")
decorateValueBlock("logic_boolean", "Boolean")

