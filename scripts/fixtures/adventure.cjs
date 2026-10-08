const character = {
  name: '林', race: 'human', hp: 80, maxHp: 120, pleasure: 0, desire: 0, floor: 1, explorationProgress: 40,
  backstory: '成年探险者，寻找失踪的向导。', costumeDescription: '旅行斗篷', otherDescription: '', avatarUrl: null,
  measurements: { bust: '90', waist: '65', hip: '92' },
  bodyDevelopment: { breast: 0, clitoris: 0, urethra: 0, vagina: 0, anus: 0, exp: { breast: 37 } },
  statusEffects: [], encounter: null,
}
const effect = { id: 'fatigue', title: '疲劳', description: '移动速度下降' }
const encounter = { id: 'stone_gate', name: '石门', kind: 'trap', summary: '出口被关闭', restraint: 0 }
const options = ['检查门锁', '观察通道', '核对地图', '返回营地']
function reply(state = character, narrative = '石门上的刻痕指向东侧通道，冒险者发现了新的路线线索。') {
  const { descriptions, ...bodyDevelopment } = state.bodyDevelopment
  const stats = { hp: state.hp, pleasure: state.pleasure, desire: state.desire, floor: state.floor,
    encounter: state.encounter, measurements: state.measurements, bodyDevelopment, statusEffects: state.statusEffects }
  return `${narrative}\n[OPTIONS]\n${options.map((option, index) => `${index + 1}. ${option}`).join('\n')}\n[/OPTIONS]\n[SCENE: dungeon, stone_door, torch]\n[STATS:${JSON.stringify(stats)}]\n[DESC:${JSON.stringify(descriptions ?? { breast: '无变化' })}]`
}
module.exports = { character, effect, encounter, options, reply }
