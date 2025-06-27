// 項目名の配列（items.csvから読み込み）
let items = [];
// 元データ配列（data.csvから読み込み）
let data = [];
// 表示用バブル配列（各データに描画情報追加）
let bubbles = [];
// 重複を除いた支出項目と議員名の配列
let uniqueItems = [];
let uniqueNames = [];
// 支出項目ごとの色マップ（item名 -> p5.Color）
let colors = {};

let mode = "all";              // 表示モード ("all", "name", "item")
let centerMap = {};            // 議員ごとのクラスタ中心座標マップ
let itemCenters = {};          // 項目ごとのクラスタ中心座標マップ
let bubbleSlider;              // バブルサイズ調整用スライダーUI

// 議員選択UI関連
let memberSelect;
let selectedMembers = [];
let isMemberListOpen = false;
let toggleMemberListBtn;
let memberListVisible = false;

// CSVデータ読み込み用
let table;
let itemsTable;

// 読み込んだ金額の最小・最大（バブルサイズのスケール用）
let minAmount = Infinity;
let maxAmount = -Infinity;

let buttons = [];  // キャンバス内ボタン管理用配列

// p5.js preloadでCSVを先に読み込み
function preload() {
  table = loadTable('data.csv', 'csv', 'header');
  itemsTable = loadTable('items.csv', 'csv', 'header');
}

function setup() {
  // キャンバスと判例divを囲む親div（幅1200pxで中央寄せ）
  let wrapper = createDiv('');
  wrapper.style('width', '1200px');
  wrapper.style('margin', '20px auto 0 auto');
  wrapper.style('position', 'relative');

  // 判例表示用div（キャンバスの上、横並びで折返し対応）
  let legendDiv = createDiv('');
  legendDiv.style('width', '100%');
  legendDiv.style('padding', '10px 10px');
  legendDiv.style('background', '#f0f0f0');
  legendDiv.style('display', 'flex');
  legendDiv.style('flex-wrap', 'wrap');
  legendDiv.style('gap', '15px 30px');
  legendDiv.style('box-sizing', 'border-box');
  legendDiv.parent(wrapper);

  // items.csvから項目を読み込み、色を生成＆判例divに表示
  items = [];
  for (let r = 0; r < itemsTable.getRowCount(); r++) {
	items.push(itemsTable.getString(r, 0));
  }
  uniqueItems = [...new Set(items)];

  uniqueItems.forEach((item, i) => {
	// 色生成（sin, cosで適当にバリエーション作成）
	colors[item] = color(
	  floor(150 + 70 * sin(i * 0.5)),
	  floor(120 + 80 * cos(i * 0.5)),
	  floor(200 - 70 * sin(i * 0.5))
	);

	let c = colors[item];
	let colStr = c.toString('#rrggbb');
	// SVG＋テキストで色丸アイコンと項目名をセットで表示
	let itemSpan = createSpan('');
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

  // キャンバス生成し、wrapper内に設置（中央揃え、枠線あり）
  let canvas = createCanvas(1200, 900);
  canvas.parent(wrapper);
  canvas.style('display', 'block');
  canvas.style('margin', 'auto');
  canvas.style('border', '2px solid #333');

  textAlign(CENTER, CENTER);

  // data.csvから議員名・項目・金額を読み込み
  data = [];
  for (let r = 0; r < table.getRowCount(); r++) {
	let name = table.getString(r, 'name');
	let item = table.getString(r, 'item');
	let amount = int(table.getString(r, 'amount'));
	data.push({ name, item, amount });

	// 読み込み時に最小・最大金額を検出
	if (amount < minAmount) minAmount = amount;
	if (amount > maxAmount) maxAmount = amount;
  }

  // 議員名のユニーク配列作成
  uniqueNames = [...new Set(data.map(d => d.name))];

  // バブルの初期化。金額の最小最大で半径をスケール
  bubbles = [];
  for (let d of data) {
	let baseR = map(d.amount, minAmount, maxAmount, 10, 30);
	bubbles.push({
	  ...d,
	  baseR: baseR,
	  r: baseR,
	  x: random(width),    // 初期位置はランダム
	  y: random(height),
	  targetX: width / 2,  // 目標位置（移動先）
	  targetY: height / 2,
	  vx: 0,               // 速度x
	  vy: 0,               // 速度y
	  stopped: false       // 移動停止フラグ
	});
  }

  // 並べ替えボタン群（キャンバス内上部）
  buttons.push(new Btn(300, 10, 120, 36, '議員ごと', () => setMode('name')));
  buttons.push(new Btn(480, 10, 120, 36, '支出項目ごと', () => setMode('item')));
  buttons.push(new Btn(660, 10, 120, 36, '全部まとめて', () => setMode('all')));

  // バブルサイズスライダー（キャンバス内下部中央に配置）
  bubbleSlider = createSlider(0.2, 2, 0.2, 0.01);
  bubbleSlider.position((windowWidth - width) / 2 + width / 2 - 100, height - 50);
  bubbleSlider.style('width', '200px');

  // 議員選択UIはキャンバス外にdivとして作成し、縦並びで自然に配置
  let memberDiv = createDiv('');
  memberDiv.style('width', '1200px');
  memberDiv.style('text-align', 'center');
  memberDiv.style('margin', '20px auto 40px');
  memberDiv.parent(document.body);

  // 議員選択用のselectボックス
  memberSelect = createSelect();
  memberSelect.elt.multiple = true;
  memberSelect.elt.size = 8;
  memberSelect.style('width', '250px');
  memberSelect.option('すべての議員');
  for (let n of uniqueNames) memberSelect.option(n);
  memberSelect.changed(updateSelectedMembers);
  memberSelect.parent(memberDiv);
  memberSelect.hide();

  // 議員リスト表示／非表示切替ボタン
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

  // 初期モードを「全部まとめて」に設定
  setMode('all');
}

function draw() {
  background(240);

  // キャンバス内の上部にあるモード切替ボタンを描画
  for (let btn of buttons) btn.draw();

  let bubbleScale = bubbleSlider.value();

  // 表示対象のバブルと議員名のリストを決定（議員別モードかつ選択があれば絞る）
  let showBubbles = bubbles;
  let showNames = uniqueNames;
  if (mode === "name" && selectedMembers.length > 0) {
	showBubbles = bubbles.filter(b => selectedMembers.includes(b.name));
	showNames = selectedMembers;
  }

  // バブルの半径をスライダー値でスケール
  for (let b of showBubbles) b.r = b.baseR * bubbleScale;

  // 表示モードごとにバブルの目標座標をセット
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

  // クラスタ内のバブル同士の重なりを避ける反発処理
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

  // 全体の重なりを繰り返し解消する処理（20回繰り返し）
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

  // バブルの移動処理と停止判定
  for (let b of showBubbles) {
	if (!b.stopped) {
	  let tx = b.targetX, ty = b.targetY;
	  let dist2 = (tx - b.x) * (tx - b.x) + (ty - b.y) * (ty - b.y);

	  // 他のバブルと重なっていないかチェック
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

	  // 停止条件の距離・速度閾値をモード別に設定
	  const STOP_DIST = (mode === 'all') ? 1.0 : 0.3;
	  const STOP_VEL = (mode === 'all') ? 0.05 : 0.01;

	  // 条件を満たせば停止。そうでなければイージングで目標に移動
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
	// バブル描画（色と枠線つき）
	fill(colors[b.item]);
	stroke(80);
	strokeWeight(1);
	ellipse(b.x, b.y, b.r * 2);
  }

  // クラスタ名ラベル（クラスタ中心に白縁つきで描画）
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

  // マウスオーバー時のツールチップ表示（議員名・項目・金額）
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

// モード切り替え処理（all/name/item）
// 議員リスト表示の切替もここで制御
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

// 議員選択変更時の処理（複数選択対応）
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

// 選択議員数に応じたグリッド（碁盤目）中心座標計算
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

// バブル初期位置リセット
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
	  // 中心周辺にランダム分散
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

// 横に均等に項目クラスタの中心座標を返す
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

// ボタン用クラス（描画と押下判定）
class Btn {
  constructor(x, y, w, h, label, cb) {
	this.x = x; this.y = y; this.w = w; this.h = h;
	this.label = label; this.cb = cb;
  }
  draw() {
	fill(255);
	stroke(100); strokeWeight(1);
	rect(this.x, this.y, this.w, this.h, 8);
	fill(40);
	noStroke();
	textSize(16);
	text(this.label, this.x + this.w/2, this.y + this.h/2);
  }
  pressed(mx, my) {
	return mx > this.x && mx < this.x + this.w && my > this.y && my < this.y + this.h;
  }
}

function mousePressed() {
  for (let btn of buttons) {
	if (btn.pressed(mouseX, mouseY)) btn.cb();
  }
}