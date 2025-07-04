let items = [];
let data = [];
let bubbles = [];
let uniqueItems = [];
let uniqueNames = [];
let colors = {};

let mode = "all";
let centerMap = {};
let itemCenters = {};

let memberSelect;
let selectedMembers = [];

let isMemberListOpen = false;
let toggleMemberListBtn;
let memberListVisible = false;

let table;
let itemsTable;

let minAmount = Infinity;
let maxAmount = -Infinity;

let buttons = [];

let wrapper, legendDiv, memberDiv, buttonDiv, sliderDiv;

function preload() {
  table = loadTable('data.csv', 'csv', 'header');
  itemsTable = loadTable('items.csv', 'csv', 'header');
}

// 画面要素の生成をまとめた関数
function setupUI(w, h) {
  wrapper = createDiv('');
  wrapper.style('width', w + 'px');
  wrapper.style('margin', '20px auto 0 auto');
  wrapper.style('position', 'relative');

  legendDiv = createDiv('');
  legendDiv.style('width', '100%');
  legendDiv.style('padding', '10px 10px');
  legendDiv.style('background', '#f0f0f0');
  legendDiv.style('display', 'flex');
  legendDiv.style('flex-wrap', 'wrap');
  legendDiv.style('gap', '15px 30px');
  legendDiv.style('box-sizing', 'border-box');
  legendDiv.parent(wrapper);

  buttonDiv = createDiv('');
  buttonDiv.style('width', '100%');
  buttonDiv.style('display', 'flex');
  buttonDiv.style('justify-content', 'center');
  buttonDiv.style('gap', '24px');
  buttonDiv.style('margin', '14px 0 12px 0');
  buttonDiv.parent(wrapper);

  const canvas = createCanvas(w, h);
  canvas.parent(wrapper);
  canvas.style('display', 'block');
  canvas.style('margin', 'auto');
  canvas.style('border', '2px solid #333');
  textAlign(CENTER, CENTER);

  sliderDiv = createDiv('');
  sliderDiv.style('width', '100%');
  sliderDiv.style('text-align', 'center');
  sliderDiv.style('margin', '16px 0 0 0');
  sliderDiv.parent(wrapper);

  bubbleSlider = createSlider(0.2, 2, 0.2, 0.01);
  bubbleSlider.style('width', '240px');
  bubbleSlider.parent(sliderDiv);

  memberDiv = createDiv('');
  memberDiv.style('width', w + 'px');
  memberDiv.style('text-align', 'center');
  memberDiv.style('margin', '20px auto 40px');
  memberDiv.parent(document.body);
}

// CSVデータを読み込んで配列に展開
function loadData() {
  items = [];
  for (let r = 0; r < itemsTable.getRowCount(); r++) {
        items.push(itemsTable.getString(r, 0));
  }
  uniqueItems = [...new Set(items)];

  uniqueNames = [];
  data = [];
  for (let r = 0; r < table.getRowCount(); r++) {
        const name = table.getString(r, 'name');
        const item = table.getString(r, 'item');
        const amount = int(table.getString(r, 'amount'));
        data.push({ name, item, amount });
        if (amount < minAmount) minAmount = amount;
        if (amount > maxAmount) maxAmount = amount;
        if (!uniqueNames.includes(name)) uniqueNames.push(name);
  }
}

// 凡例部分を生成
function createLegend() {
  uniqueItems.forEach((item, i) => {
        colors[item] = color(
          floor(150 + 70 * sin(i * 0.5)),
          floor(120 + 80 * cos(i * 0.5)),
          floor(200 - 70 * sin(i * 0.5))
        );

        const c = colors[item];
        const colStr = c.toString('#rrggbb');
        const itemSpan = createSpan('');
        itemSpan.html(`
          <svg width="20" height="20" style="vertical-align:middle; margin-right:5px;">
                <circle cx="10" cy="10" r="8" fill="${colStr}" stroke="#555" stroke-width="1"/>
          </svg>
          <span style="font-size:16px; vertical-align: middle;">${item}</span>
        `);
        itemSpan.style('display', 'inline-flex');
        itemSpan.style('align-items', 'center');
        itemSpan.parent(legendDiv);
  });
}

// 表示モード切り替えボタンを作成
function setupButtons() {
  buttons = [];
  buttons.push(new Btn('議員ごと', () => setMode('name')));
  buttons.push(new Btn('支出項目ごと', () => setMode('item')));
  buttons.push(new Btn('全部まとめて', () => setMode('all')));

  for (let btn of buttons) {
        const b = createButton(btn.label);
        b.style('font-size', '17px');
        b.style('padding', '7px 22px');
        b.style('margin', '0 3px');
        b.style('border-radius', '8px');
        b.style('border', '1.5px solid #666');
        b.style('background', '#fff');
        b.mousePressed(btn.cb);
        b.parent(buttonDiv);
        btn._dom = b; // DOM要素参照を保持
  }
}

// 議員選択用のUIを作成
function setupMemberList() {
  memberSelect = createSelect();
  memberSelect.elt.multiple = true;
  memberSelect.elt.size = 8;
  memberSelect.style('width', '100%');
  memberSelect.option('すべての議員');
  for (let n of uniqueNames) memberSelect.option(n);
  memberSelect.changed(updateSelectedMembers);
  memberSelect.parent(memberDiv);
  memberSelect.hide();

  toggleMemberListBtn = createButton('議員リスト表示');
  toggleMemberListBtn.style('font-size', '14px');
  toggleMemberListBtn.style('margin-left', '12px');
  toggleMemberListBtn.parent(memberDiv);
  toggleMemberListBtn.mousePressed(() => {
        memberListVisible = !memberListVisible;
        if (memberListVisible) {
          memberSelect.show();
          toggleMemberListBtn.html('議員リスト非表示');
        } else {
          memberSelect.hide();
          toggleMemberListBtn.html('議員リスト表示');
        }
  });
  toggleMemberListBtn.hide();
}

// バブルデータを作成
function createBubbles() {
  bubbles = [];
  for (let d of data) {
        const baseR = map(d.amount, minAmount, maxAmount, 1, 30);
        bubbles.push({
          ...d,
          baseR: baseR,
          r: baseR,
          x: random(width),
          y: random(height),
          targetX: width / 2,
          targetY: height / 2,
          vx: 0,
          vy: 0,
          stopped: false
        });
  }
}

function setup() {
  const canvasWidth = min(1200, windowWidth * 0.95);
  const canvasHeight = canvasWidth * 0.75;

  setupUI(canvasWidth, canvasHeight);
  loadData();
  createLegend();
  setupButtons();
  setupMemberList();
  createBubbles();

  setMode('all');
}

function windowResized() {
  let canvasWidth = min(1200, windowWidth * 0.95);
  let canvasHeight = canvasWidth * 0.75;
  resizeCanvas(canvasWidth, canvasHeight);

  wrapper.style('width', canvasWidth + 'px');
  memberDiv.style('width', canvasWidth + 'px');
}

function draw() {
  background(240);

  let bubbleScale = bubbleSlider.value();

  let showBubbles = bubbles;
  let showNames = uniqueNames;
  if (mode === "name" && selectedMembers.length > 0) {
	showBubbles = bubbles.filter(b => selectedMembers.includes(b.name));
	showNames = selectedMembers;
  }

  for (let b of showBubbles) b.r = b.baseR * bubbleScale;

  if (mode == "all") {
	let cx = width / 2, cy = height / 2;
	for (let b of showBubbles) {
	  b.targetX = cx;
	  b.targetY = cy;
	}
  } else if (mode == "name") {
	if (showNames.length == 0) showNames = uniqueNames;
	if (
	  !centerMap ||
	  Object.keys(centerMap).length !== showNames.length ||
	  Object.keys(centerMap).some(n => !showNames.includes(n))
	) {
	  centerMap = gridCentersForSelection(showNames, 60, 60);
	}
	for (let b of showBubbles) {
	  let c = centerMap[b.name];
	  b.targetX = c.x;
	  b.targetY = c.y;
	}
  } else if (mode == "item") {
	if (Object.keys(itemCenters).length === 0) {
	  itemCenters = horizontalCenters(uniqueItems, 100);
	}
	for (let b of showBubbles) {
	  let c = itemCenters[b.item];
	  b.targetX = c.x;
	  b.targetY = c.y;
	}
  }

  let clusterKey = mode === "name" ? "name" : mode === "item" ? "item" : null;
  let clusterGroups = {};
  if (clusterKey) {
	for (let b of showBubbles) {
	  let key = b[clusterKey];
	  if (!clusterGroups[key]) clusterGroups[key] = [];
	  clusterGroups[key].push(b);
	}
	for (let groupName in clusterGroups) {
	  let group = clusterGroups[groupName];
	  for (let i = 0; i < group.length; i++) {
		let b1 = group[i];
		for (let j = i + 1; j < group.length; j++) {
		  let b2 = group[j];
		  let dx = b2.x - b1.x;
		  let dy = b2.y - b1.y;
		  let d = sqrt(dx * dx + dy * dy);
		  let minDist = b1.r + b2.r + 2;
		  if (d < minDist && d > 0) {
			let overlap = (minDist - d) / 2;
			let angle = atan2(dy, dx);
			b1.x -= overlap * cos(angle);
			b1.y -= overlap * sin(angle);
			b2.x += overlap * cos(angle);
			b2.y += overlap * sin(angle);
			b1.vx = 0; b1.vy = 0;
			b2.vx = 0; b2.vy = 0;
		  }
		}
	  }
	}
  }

  for (let repeat = 0; repeat < 20; repeat++) {
	for (let i = 0; i < showBubbles.length; i++) {
	  let b1 = showBubbles[i];
	  if (b1.stopped) continue;
	  for (let j = i + 1; j < showBubbles.length; j++) {
		let b2 = showBubbles[j];
		if (b2.stopped) continue;
		let dx = b2.x - b1.x;
		let dy = b2.y - b1.y;
		let d = sqrt(dx * dx + dy * dy);
		let minDist = b1.r + b2.r + 2;
		if (d < minDist && d > 0) {
		  let overlap = (minDist - d) / 2;
		  let angle = atan2(dy, dx);
		  b1.x -= overlap * cos(angle);
		  b1.y -= overlap * sin(angle);
		  b2.x += overlap * cos(angle);
		  b2.y += overlap * sin(angle);
		  b1.vx = 0; b1.vy = 0;
		  b2.vx = 0; b2.vy = 0;
		}
	  }
	}
  }

  for (let b of showBubbles) {
	if (!b.stopped) {
	  let tx = b.targetX, ty = b.targetY;
	  let dist2 = (tx - b.x) * (tx - b.x) + (ty - b.y) * (ty - b.y);

	  let hasOverlap = false;
	  let overlapMargin = (mode === 'all') ? 5 : 0.2;
	  for (let other of showBubbles) {
		if (other === b) continue;
		let d = dist(b.x, b.y, other.x, other.y);
		if (d < b.r + other.r + overlapMargin) {
		  hasOverlap = true;
		  break;
		}
	  }

	  const STOP_DIST = (mode === 'all') ? 1.0 : 0.3;
	  const STOP_VEL = (mode === 'all') ? 0.05 : 0.01;

	  if (
		dist2 < STOP_DIST * STOP_DIST &&
		abs(b.vx) < STOP_VEL &&
		abs(b.vy) < STOP_VEL &&
		!hasOverlap
	  ) {
		b.x = tx;
		b.y = ty;
		b.vx = 0;
		b.vy = 0;
		b.stopped = true;
	  } else {
		b.vx += (tx - b.x) * 0.06;
		b.vy += (ty - b.y) * 0.06;
		b.vx *= 0.7;
		b.vy *= 0.7;
		b.x += b.vx;
		b.y += b.vy;
	  }
	}
	fill(colors[b.item]);
	stroke(80);
	strokeWeight(1);
	ellipse(b.x, b.y, b.r * 2);
  }

  if (mode == "name") {
	textAlign(CENTER, CENTER);
	for (let k of showNames) {
	  let c = centerMap[k];
	  stroke(255);
	  strokeWeight(3);
	  fill(40);
	  textSize(14);
	  textStyle(NORMAL);
	  text(k, c.x, c.y);
	}
	strokeWeight(1);
  }
  if (mode == "item") {
	textAlign(CENTER, CENTER);
	for (let k in itemCenters) {
	  let c = itemCenters[k];
	  stroke(255);
	  strokeWeight(3);
	  fill(40);
	  textSize(14);
	  textStyle(NORMAL);
	  text(k, c.x, c.y);
	}
	strokeWeight(1);
  }

  let hovered = null;
  for (let b of showBubbles) {
	if (dist(mouseX, mouseY, b.x, b.y) < b.r) hovered = b;
  }
  if (hovered) {
	let str = `議員: ${hovered.name}\n項目: ${hovered.item}\n金額: ${hovered.amount.toLocaleString()}円`;
	textSize(16);
	let pad = 14;
	let lines = str.split('\n');
	let w = max(...lines.map(s => textWidth(s))) + pad * 2;
	let h = lines.length * 24 + pad;
	let bx = hovered.x, by = hovered.y - hovered.r - h/2 - 8;
	bx = constrain(bx, w/2, width - w/2);
	by = max(by, 30);
	fill(255, 245, 200, 230);
	stroke(180,180,0,120);
	strokeWeight(1.5);
	rect(bx - w/2, by - h/2, w, h, 10);
	fill(60);
	noStroke();
	for (let i = 0; i < lines.length; i++) {
	  text(lines[i], bx, by - h/2 + 20 + i * 24);
	}
  }
}

// ボタンのクラスは描画しない
class Btn {
  constructor(label, cb) {
	this.label = label;
	this.cb = cb;
	this._dom = null;
  }
}

// 旧ボタン描画イベントは不要
function mousePressed() {}

function setMode(m) {
  if (m == "name") {
	if (mode == "name" && isMemberListOpen) {
	  memberSelect.hide();
	  toggleMemberListBtn.hide();
	  memberListVisible = false;
	  isMemberListOpen = false;
	  mode = "all";
	  itemCenters = {};
	} else {
	  centerMap = {};
	  memberSelect.hide();
	  memberListVisible = false;
	  toggleMemberListBtn.show();
	  toggleMemberListBtn.html('議員リスト表示');
	  memberSelect.value('すべての議員');
	  selectedMembers = [];
	  resetBubblePositions();
	  isMemberListOpen = true;
	  mode = "name";
	}
  } else {
	itemCenters = {};
	memberSelect.hide();
	toggleMemberListBtn.hide();
	memberListVisible = false;
	selectedMembers = [];
	memberSelect.value('すべての議員');
	resetBubblePositions();
	mode = m;
	isMemberListOpen = false;
  }
  for (let b of bubbles) b.stopped = false;
}

function updateSelectedMembers() {
  selectedMembers = [];
  let opts = memberSelect.elt.selectedOptions;
  let allSelected = false;
  for (let i = 0; i < opts.length; i++) {
	if (opts[i].value === 'すべての議員') {
	  allSelected = true;
	  break;
	} else {
	  selectedMembers.push(opts[i].value);
	}
  }
  if (allSelected) {
	selectedMembers = [];
	memberSelect.value('すべての議員');
  }
  resetBubblePositions();
}

function gridCentersForSelection(names, marginX=70, marginY=150) {
  let n = names.length;
  if (n == 1) {
	return {[names[0]]: {x: width/2, y: height/2}};
  } else if (n == 2) {
	let cx = [width/3, width*2/3];
	let cy = [height/2, height/2];
	let map = {};
	for (let i = 0; i < 2; i++) map[names[i]] = {x: cx[i], y: cy[i]};
	return map;
  } else {
	let cols = ceil(sqrt(n));
	let rows = ceil(n / cols);
	let cellW = (width - marginX*2) / cols;
	let cellH = (height - marginY*2 - 60) / rows;
	let map = {};
	let idx = 0;
	for (let r = 0; r < rows; r++) {
	  for (let c = 0; c < cols; c++) {
		if (idx >= names.length) break;
		let x = marginX + cellW/2 + c*cellW;
		let y = marginY + 60 + cellH/2 + r*cellH;
		map[names[idx]] = {x, y};
		idx++;
	  }
	}
	return map;
  }
}

function resetBubblePositions() {
  let showNames = (mode === "name" && selectedMembers.length > 0) ? selectedMembers : uniqueNames;
  let centers = gridCentersForSelection(showNames, 60, 60);

  let n = showNames.length;
  let cols = ceil(sqrt(n));
  let rows = ceil(n / cols);
  let cellW = (width - 60*2) / cols;
  let cellH = (height - 60*2 - 60) / rows;

  for (let b of bubbles) {
	if (mode === "name" && showNames.includes(b.name)) {
	  let c = centers[b.name];
	  let rlimX = cellW/2-40, rlimY = cellH/2-40;
	  b.x = c.x + random(-rlimX, rlimX);
	  b.y = c.y + random(-rlimY, rlimY);
	  b.vx = 0;
	  b.vy = 0;
	  b.stopped = false;
	} else if (mode !== "name") {
	  b.x = random(width);
	  b.y = random(height);
	  b.vx = 0; b.vy = 0;
	  b.stopped = false;
	}
  }
}

function horizontalCenters(items, margin = 100) {
  let n = items.length;
  let interval = (width - 2 * margin) / (n - 1);
  let y = height / 2;
  let map = {};
  items.forEach((item, i) => {
	let x = margin + i * interval;
	map[item] = {x, y};
  });
  return map;
}
