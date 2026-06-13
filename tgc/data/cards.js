const TGC_CARDS = [
  {
    id: "koran",
    name: "コラン",
    type: "monster",
    typeLabel: "幻獣",
    rarity: "common",
    cost: 1,
    attack: 1,
    health: 1,
    description: "この幻獣が戦場に出たとき、カードを1枚引く。",
    flavor: "小さなその瞳には、無限の可能性が宿っている。",
    evolutionTo: "korantan",
    image: "assets/cards/koran.png",
    visual: {
      icon: "◇",
      title: "白き幼体",
      tone: "frost"
    }
  },
  {
    id: "korantan",
    name: "コランタン",
    type: "monster",
    typeLabel: "幻獣",
    rarity: "uncommon",
    cost: 2,
    attack: 3,
    health: 3,
    description: "この幻獣が攻撃するたび、カードを1枚引く。",
    flavor: "月の導きのもと、力は覚醒し、意志は鋭く研がれる。",
    evolutionTo: "korangarth",
    image: "assets/cards/korantan.png",
    visual: {
      icon: "◆",
      title: "月牙の狼",
      tone: "moon"
    }
  },
  {
    id: "korangarth",
    name: "コランガース",
    type: "monster",
    typeLabel: "幻獣",
    rarity: "rare",
    cost: 4,
    attack: 6,
    health: 6,
    description: "飛行、トランプル。この幻獣が戦場に出たとき、すべての対戦相手はライフを2点失う。",
    flavor: "天と地をつなぐ咆哮が、世界に新たな秩序を刻む。",
    evolutionTo: "",
    image: "assets/cards/korangarth.png",
    visual: {
      icon: "✦",
      title: "蒼黒竜狼",
      tone: "dragon"
    }
  },
  {
    id: "light_aura",
    name: "光のオーラ",
    type: "aura",
    typeLabel: "オーラ",
    rarity: "common",
    cost: 2,
    attack: null,
    health: null,
    description: "すべての味方クリーチャーは、ターン終了時まで +2/+2 の修整を受ける。",
    flavor: "天空より降り注ぐ祝福が、仲間たちに力を与える。",
    evolutionTo: "",
    image: "assets/cards/light_aura.png",
    visual: {
      icon: "☼",
      title: "天光の柱",
      tone: "light"
    }
  },
  {
    id: "dragon_aura",
    name: "竜のオーラ",
    type: "aura",
    typeLabel: "オーラ",
    rarity: "uncommon",
    cost: 3,
    attack: null,
    health: null,
    description: "味方の幻獣1体は、ターン終了時まで飛行を得る。",
    flavor: "竜の力をその身に宿し、空を駆け抜ける。",
    evolutionTo: "",
    image: "assets/cards/dragon_aura.png",
    visual: {
      icon: "△",
      title: "竜翼の加護",
      tone: "dragon"
    }
  },
  {
    id: "dark_aura",
    name: "闇のオーラ",
    type: "sorcery",
    typeLabel: "ソーサリー",
    rarity: "uncommon",
    cost: 2,
    attack: null,
    health: null,
    description: "すべての敵に3点のダメージを与える。",
    flavor: "暗黒は静かに、だが確実に心を侵す。",
    evolutionTo: "",
    image: "assets/cards/dark_aura.png",
    visual: {
      icon: "●",
      title: "侵食する影",
      tone: "shadow"
    }
  },
  {
    id: "flame_aura",
    name: "炎のオーラ",
    type: "sorcery",
    typeLabel: "ソーサリー",
    rarity: "uncommon",
    cost: 2,
    attack: null,
    health: null,
    description: "味方の幻獣1体は、ターン終了時まで二段攻撃を得る。",
    flavor: "燃える心が、すべての限界を超えさせる。",
    evolutionTo: "",
    image: "assets/cards/flame_aura.png",
    visual: {
      icon: "▲",
      title: "燃える心火",
      tone: "flame"
    }
  },
  {
    id: "moon_crystal",
    name: "月晶石",
    type: "item",
    typeLabel: "アイテム",
    rarity: "rare",
    cost: 1,
    attack: null,
    health: null,
    description: "あなたの幻獣1体を選ぶ。その幻獣は次の進化に少し近づく。",
    flavor: "冷たい光を閉じこめた石は、幼い願いの輪郭を照らす。",
    evolutionTo: "",
    image: "assets/cards/moon_crystal.png",
    visual: {
      icon: "✧",
      title: "進化の欠片",
      tone: "moon"
    }
  }
];
