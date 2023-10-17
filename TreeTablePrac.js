// 트리구조에서 축소된 상태일 때 링크들의 최하위로 보이는 조상(ancestor) 연결되도록 도와주는 기능을 제공한다.
class TreeNode extends go.Node{
  findVisibleNode() {
    var n = this;
    while (n !== null && !n.isVisible()){
      n = n.findTreeParentNode();
    }
    return n;
  }
}

// 데이터 매핑 링크를 제어하기 위한 변수 정의
// 세 가지 옵션 중 하나를 가질 수 있다.
// "Normal" : 일반적인 routing으로, fromEndSegmentLength & toEndSegmentLength가 고정된다.
// "ToGroup" : 연결된 routes는 모든 길은 연결된 노드로 가는것 보다는 그 그룹의 끝에서 멈춘다.
// "ToNode" : 연결된 노드까지는 꺽이지 않고 그대로 가지만 그룹의 가장자리에서만 꺽인다.
var ROUTINGSTYLE = "ToGroup";

// MappingLink 클래스를 정의하며 go.Link를 확장하였다.
// 이 클래스틑 어떻게 그려지고 계산되어야 하는지를 제어한다.
class MappingLink extends go.Link {
  getLinkPoint(node, port, spot, from, ortho, othernode, otherport) {
    if (ROUTINGSTYLE !== "ToGroup") {
      return super.getLinkPoint(node, port, spot, from, ortho, othernode, otherport);
    } else {
      var r = port.getDocumentBounds();
      var group = node.containingGroup;
      var b = (group !== null) ? group.actualBounds : node.actualBounds;
      var op = othernode.getDocumentPoint(go.Spot.Center);
      var x = (op.x > r.centerX) ? b.right : b.left;
      return new go.Point(x, r.centerY);
    }
  }

  computePoints() {
    var result = super.computePoints();
    if (result && ROUTINGSTYLE === "ToNode") {
      var fn = this.fromNode;
      var tn = this.toNode;
      if (fn && tn) {
        var fg = fn.containingGroup;
        var fb = fg ? fg.actualBounds : fn.actualBounds;
        var fpt = this.getPoint(0);
        var tg = tn.containingGroup;
        var tb = tg ? tg.actualBounds : tn.actualBounds;
        var tpt = this.getPoint(this.pointsCount-1);
        this.setPoint(1, new go.Point((fpt.x < tpt.x) ? fb.right : fb.left, fpt.y));
        this.setPoint(this.pointsCount-2, new go.Point((fpt.x < tpt.x) ? tb.left : tb.right, tpt.y));
      }
    }
    return result;
  }
}

function init() {

  // Since 2.2 you can also author concise templates with method chaining instead of GraphObject.make
  // For details, see https://gojs.net/latest/intro/buildingObjects.html
  const $ = go.GraphObject.make;  // for conciseness in defining templates

  function handleTreeCollapseExpand(e) {
    e.subject.each(n => {
      n.findExternalTreeLinksConnected().each(l => l.invalidateRoute());
    });
  }

  myDiagram =
    new go.Diagram("myDiagramDiv",
      {
        "commandHandler.copiesTree": true,
        "commandHandler.deletesTree": true,
        "TreeCollapsed": handleTreeCollapseExpand,
        "TreeExpanded": handleTreeCollapseExpand,
        // newly drawn links always map a node in one tree to a node in another tree
        "linkingTool.archetypeLinkData": { category: "Mapping" },
        "linkingTool.linkValidation": checkLink,
        "relinkingTool.linkValidation": checkLink,
        "undoManager.isEnabled": true,
        "ModelChanged": e => {
          if (e.isTransactionFinished) {  // show the model data in the page's TextArea
            document.getElementById("mySavedModel").textContent = e.model.toJson();
          }
        }
      });

  // All links must go from a node inside the "Left Side" Group to a node inside the "Right Side" Group.
  function checkLink(fn, fp, tn, tp, link) {
    // make sure the nodes are inside different Groups
    if (fn.containingGroup === null || fn.containingGroup.data.key !== -1) return false;
    if (tn.containingGroup === null || tn.containingGroup.data.key !== -2) return false;
    //// optional limit to a single mapping link per node
    //if (fn.linksConnected.any(l => l.category === "Mapping")) return false;
    //if (tn.linksConnected.any(l => l.category === "Mapping")) return false;
    return true;
  }

  // Each node in a tree is defined using the default nodeTemplate.
  myDiagram.nodeTemplate =
    $(TreeNode,
      { movable: false, copyable: false, deletable: false },  // user cannot move an individual node
      // no Adornment: instead change panel background color by binding to Node.isSelected
      {
        selectionAdorned: false,
        background: "white",
        mouseEnter: (e, node) => node.background = "aquamarine",
        mouseLeave: (e, node) => node.background = node.isSelected ? "skyblue" : "white"
      },
      new go.Binding("background", "isSelected", s => s ? "skyblue" : "white").ofObject(),
      // whether the user can start drawing a link from or to this node depends on which group it's in
      new go.Binding("fromLinkable", "group", k => k === -1),
      new go.Binding("toLinkable", "group", k => k === -2),
      $("TreeExpanderButton",  // support expanding/collapsing subtrees
        {
          width: 14, height: 14,
          "ButtonIcon.stroke": "white",
          "ButtonIcon.strokeWidth": 2,
          "ButtonBorder.fill": "goldenrod",
          "ButtonBorder.stroke": null,
          "ButtonBorder.figure": "Rectangle",
          "_buttonFillOver": "darkgoldenrod",
          "_buttonStrokeOver": null,
          "_buttonFillPressed": null
        }),
      $(go.Panel, "Horizontal",
        { position: new go.Point(16, 0) },
        //// optional icon for each tree node
        //$(go.Picture,
        //  { width: 14, height: 14,
        //    margin: new go.Margin(0, 4, 0, 0),
        //    imageStretch: go.GraphObject.Uniform,
        //    source: "images/defaultIcon.png" },
        //  new go.Binding("source", "src")),
        $(go.TextBlock,
          new go.Binding("text", "key", s => "item " + s))
      )  // end Horizontal Panel
    );  // end Node

  // These are the links connecting tree nodes within each group.

  myDiagram.linkTemplate = $(go.Link);  // without lines

  myDiagram.linkTemplate =  // with lines
    $(go.Link,
      {
        selectable: false,
        routing: go.Link.Orthogonal,
        fromEndSegmentLength: 4,
        toEndSegmentLength: 4,
        fromSpot: new go.Spot(0.001, 1, 7, 0),
        toSpot: go.Spot.Left
      },
      $(go.Shape,
        { stroke: "lightgray" }));

  // These are the blue links connecting a tree node on the left side with one on the right side.
  myDiagram.linkTemplateMap.add("Mapping",
    $(MappingLink,
      { isTreeLink: false, isLayoutPositioned: false, layerName: "Foreground" },
      { fromSpot: go.Spot.Right, toSpot: go.Spot.Left },
      { relinkableFrom: true, relinkableTo: true },
      $(go.Shape, { stroke: "blue", strokeWidth: 2 })
    ));

  myDiagram.groupTemplate =
    $(go.Group, "Auto",
      { deletable: false, layout: makeGroupLayout() },
      new go.Binding("position", "xy", go.Point.parse).makeTwoWay(go.Point.stringify),
      new go.Binding("layout", "width", makeGroupLayout),
      $(go.Shape, { fill: "white", stroke: "lightgray" }),
      $(go.Panel, "Vertical",
        { defaultAlignment: go.Spot.Left },
        $(go.TextBlock,
          { font: "bold 14pt sans-serif", margin: new go.Margin(5, 5, 0, 5) },
          new go.Binding("text")),
        $(go.Placeholder, { padding: 5 })
      )
    );

  function makeGroupLayout() {
    return $(go.TreeLayout,  // taken from samples/treeView.html
      {
        alignment: go.TreeLayout.AlignmentStart,
        angle: 0,
        compaction: go.TreeLayout.CompactionNone,
        layerSpacing: 16,
        layerSpacingParentOverlap: 1,
        nodeIndentPastParent: 1.0,
        nodeSpacing: 0,
        setsPortSpot: false,
        setsChildPortSpot: false,
        // after the tree layout, change the width of each node so that all
        // of the nodes have widths such that the collection has a given width
        commitNodes: function() {  // method override must be function, not =>
          go.TreeLayout.prototype.commitNodes.call(this);
          if (ROUTINGSTYLE === "ToGroup") {
            updateNodeWidths(this.group, this.group.data.width || 100);
          }
        }
      });
  }

  // Create some random trees in each group
  var nodeDataArray = [
    { isGroup: true, key: -1, text: "Left Side", xy: "0 0", width: 150 },
    { isGroup: true, key: -2, text: "Right Side", xy: "300 0", width: 150 }
  ];
  var linkDataArray = [
    { from: 6, to: 1012, category: "Mapping" },
    { from: 4, to: 1006, category: "Mapping" },
    { from: 9, to: 1004, category: "Mapping" },
    { from: 1, to: 1009, category: "Mapping" },
    { from: 14, to: 1010, category: "Mapping" }
  ];

  // initialize tree on left side
  var root = { key: 0, group: -1 };
  nodeDataArray.push(root);
  for (var i = 0; i < 11;) {
    i = makeTree(3, i, 17, nodeDataArray, linkDataArray, root, -1, root.key);
  }

  // initialize tree on right side
  root = { key: 1000, group: -2 };
  nodeDataArray.push(root);
  for (var i = 0; i < 15;) {
    i = makeTree(3, i, 15, nodeDataArray, linkDataArray, root, -2, root.key);
  }
  myDiagram.model = new go.GraphLinksModel(nodeDataArray, linkDataArray);
}

// help create a random tree structure
function makeTree(level, count, max, nodeDataArray, linkDataArray, parentdata, groupkey, rootkey) {
  var numchildren = Math.floor(Math.random() * 10);
  for (var i = 0; i < numchildren; i++) {
    if (count >= max) return count;
    count++;
    var childdata = { key: rootkey + count, group: groupkey };
    nodeDataArray.push(childdata);
    linkDataArray.push({ from: parentdata.key, to: childdata.key });
    if (level > 0 && Math.random() > 0.5) {
      count = makeTree(level - 1, count, max, nodeDataArray, linkDataArray, childdata, groupkey, rootkey);
    }
  }
  return count;
}
window.addEventListener('DOMContentLoaded', init);

// this function is only needed when changing the value of ROUTINGSTYLE dynamically
function changeStyle() {
  // find user-chosen style name
  var stylename = "ToGroup";
  var radio = document.getElementsByName("MyRoutingStyle");
  for (var i = 0; i < radio.length; i++) {
    if (radio[i].checked) {
      stylename = radio[i].value; break;
    }
  }
  if (stylename !== ROUTINGSTYLE) {
    myDiagram.commit(diag => {
      ROUTINGSTYLE = stylename;
      diag.findTopLevelGroups().each(g => updateNodeWidths(g, NaN));
      diag.layoutDiagram(true);  // force layouts to happen again
      diag.links.each(l => l.invalidateRoute());
    });
  }
}