/**
 * modules/hpdc-core.js
 * HC+level 数值体系核心模块（HPDC8）
 * 版本: V8.9-P0
 * 职责: 提供 HPDC8 类及纯整数运算（比较、加法、构造、序列化），
 *       支持三种模式：HC_ONLY / LEVEL_ONLY / HYBRID。
 * 依赖: 无（纯原生 JS，需 ES2020 BigInt / Uint8Array）
 * 挂载: window.HPDC
 */

(function(global) {
  'use strict';

  /* ============================================================
     全局配置
     ============================================================ */
  const DEFAULT_CONFIG = {
    FRAC_LAYERS: 6,         // 有效小数层数: 2 / 4 / 6
    HC_TYPE: 'HC8',         // 固定 HC8，每层 8 位
    DEFAULT_MODE: 'HYBRID', // 'HC_ONLY' | 'LEVEL_ONLY' | 'HYBRID'
    SATURATION: true        // HC_ONLY 模式下 int_part 溢出时是否饱和（否则模 256）
  };

  // 若 init.js / HTML 内联脚本已注入配置，则合并；否则使用默认值
  if (!global.HPDC_CONFIG) {
    global.HPDC_CONFIG = Object.assign({}, DEFAULT_CONFIG);
  } else {
    const c = global.HPDC_CONFIG;
    // 兼容配置 UI 写入的小写键名（fracLayers / saturation / mode）
    if (typeof c.FRAC_LAYERS !== 'number' && typeof c.fracLayers === 'number') {
      c.FRAC_LAYERS = c.fracLayers;
    }
    if (typeof c.SATURATION !== 'boolean' && typeof c.saturation === 'boolean') {
      c.SATURATION = c.saturation;
    }
    if (!c.DEFAULT_MODE && typeof c.mode === 'string') {
      c.DEFAULT_MODE = c.mode;
    }
    if (typeof c.FRAC_LAYERS !== 'number') c.FRAC_LAYERS = DEFAULT_CONFIG.FRAC_LAYERS;
    if (typeof c.SATURATION !== 'boolean') c.SATURATION = DEFAULT_CONFIG.SATURATION;
    if (!c.DEFAULT_MODE) c.DEFAULT_MODE = DEFAULT_CONFIG.DEFAULT_MODE;
    if (!c.HC_TYPE) c.HC_TYPE = DEFAULT_CONFIG.HC_TYPE;
  }

  const CONFIG = global.HPDC_CONFIG;

  /* ============================================================
     运行时环境检测
     ============================================================ */
  if (typeof BigInt === 'undefined') {
    throw new Error(
      '[HPDC8] BigInt is required (ES2020+). ' +
      'Please use a modern browser or Node.js, or enable legacy mode.'
    );
  }

  /* ============================================================
     工具函数
     ============================================================ */
  function assertHPDC8(x, methodName) {
    if (!(x instanceof HPDC8)) {
      throw new TypeError(
        `[HPDC8] ${methodName} expects an HPDC8 instance, got ${typeof x}`
      );
    }
  }

  function assertSameLayerCount(a, b) {
    if (a.frac.length !== b.frac.length) {
      throw new RangeError(
        '[HPDC8] Layer count mismatch. ' +
        'Ensure both instances use the same HPDC_CONFIG.FRAC_LAYERS.'
      );
    }
  }

  /* ============================================================
     类: HPDC8
     ============================================================ */
  class HPDC8 {
    /* ----------------------------------------------------------
       模式常量
       ---------------------------------------------------------- */
    static get MODE_HC_ONLY()    { return 'HC_ONLY'; }
    static get MODE_LEVEL_ONLY() { return 'LEVEL_ONLY'; }
    static get MODE_HYBRID()     { return 'HYBRID'; }

    /* ----------------------------------------------------------
       构造函数
       ---------------------------------------------------------- */
    constructor({ mode, sign, level, int_part, frac } = {}) {
      this.mode = mode || CONFIG.DEFAULT_MODE;

      // sign: 0 正, 1 负
      this.sign = (sign === 1) ? 1 : 0;

      if (this.mode === HPDC8.MODE_LEVEL_ONLY) {
        this.level = BigInt(level || 0);
        this.int_part = 0;
        this.frac = new Uint8Array(CONFIG.FRAC_LAYERS);
      } else if (this.mode === HPDC8.MODE_HC_ONLY) {
        this.level = 0n;
        this.int_part = (int_part || 0) & 0xFF;
        this.frac = new Uint8Array(CONFIG.FRAC_LAYERS);
        if (frac) {
          const len = Math.min(frac.length, CONFIG.FRAC_LAYERS);
          for (let i = 0; i < len; i++) this.frac[i] = frac[i] & 0xFF;
        }
      } else {
        // HYBRID
        this.level = BigInt(level || 0);
        this.int_part = (int_part || 0) & 0xFF;
        this.frac = new Uint8Array(CONFIG.FRAC_LAYERS);
        if (frac) {
          const len = Math.min(frac.length, CONFIG.FRAC_LAYERS);
          for (let i = 0; i < len; i++) this.frac[i] = frac[i] & 0xFF;
        }
      }
    }

    /* ----------------------------------------------------------
       构造器: fromNumber —— 从浮点数（调试用 / 迁移用）
       ---------------------------------------------------------- */
    static fromNumber(n, mode, maxFracLayers) {
      if (typeof n !== 'number' || !isFinite(n)) {
        throw new TypeError('[HPDC8] fromNumber expects a finite number.');
      }
      const targetMode = mode || CONFIG.DEFAULT_MODE;
      const layers = maxFracLayers || CONFIG.FRAC_LAYERS;

      const sign = n < 0 ? 1 : 0;
      let absVal = Math.abs(n);

      // LEVEL_ONLY: 直接取整数部分作为 level
      if (targetMode === HPDC8.MODE_LEVEL_ONLY) {
        return new HPDC8({
          mode: targetMode,
          sign,
          level: BigInt(Math.floor(absVal))
        });
      }

      const levelVal = Math.floor(absVal / 256);
      const intPart  = Math.floor(absVal % 256);
      let rem = absVal - (levelVal * 256 + intPart);
      if (rem < 0) rem = 0;

      const frac = new Uint8Array(CONFIG.FRAC_LAYERS);
      for (let i = 0; i < layers; i++) {
        rem *= 256;
        const byte = Math.floor(rem);
        frac[i] = byte & 0xFF;
        rem -= byte;
        if (rem < 0) rem = 0;
      }

      return new HPDC8({
        mode: targetMode,
        sign,
        level: (targetMode === HPDC8.MODE_HC_ONLY) ? 0n : BigInt(levelVal),
        int_part: intPart,
        frac: frac
      });
    }

    /* ----------------------------------------------------------
       构造器: fromInteger —— 从整数（仅 level 模式）
       ---------------------------------------------------------- */
    static fromInteger(i, mode) {
      const targetMode = mode || CONFIG.DEFAULT_MODE;
      const sign = i < 0 ? 1 : 0;
      const absI = Math.abs(i);

      if (targetMode === HPDC8.MODE_HC_ONLY) {
        // 仅 HC: 整数落在 int_part，超出 255 则截断
        return new HPDC8({
          mode: HPDC8.MODE_HC_ONLY,
          sign,
          int_part: absI & 0xFF
        });
      }
      return new HPDC8({
        mode: targetMode,
        sign,
        level: BigInt(absI)
      });
    }

    /* ----------------------------------------------------------
       构造器: fromConfidence —— 将 [0,1] 置信度映射到仅 HC
       ---------------------------------------------------------- */
    static fromConfidence(c, maxFracLayers) {
      if (typeof c !== 'number' || c < 0 || c > 1) {
        throw new RangeError('[HPDC8] fromConfidence expects a number in [0, 1].');
      }
      const layers = maxFracLayers || CONFIG.FRAC_LAYERS;

      let scaled = c * 256;
      const intPart = Math.floor(scaled) & 0xFF;
      let rem = scaled - intPart;
      if (rem < 0) rem = 0;

      const frac = new Uint8Array(CONFIG.FRAC_LAYERS);
      for (let i = 0; i < layers; i++) {
        rem *= 256;
        const byte = Math.floor(rem);
        frac[i] = byte & 0xFF;
        rem -= byte;
        if (rem < 0) rem = 0;
      }

      return new HPDC8({
        mode: HPDC8.MODE_HC_ONLY,
        sign: 0,
        level: 0n,
        int_part: intPart,
        frac: frac
      });
    }

    /* ----------------------------------------------------------
       构造器: fromBytes —— 从字节数组反序列化
       格式: [sign(1), level(8BE), int_part(1), frac(FRAC_LAYERS)]
       ---------------------------------------------------------- */
    static fromBytes(bytes, mode) {
      if (!(bytes instanceof Uint8Array)) {
        throw new TypeError('[HPDC8] fromBytes expects Uint8Array.');
      }
      const expected = 1 + 8 + 1 + CONFIG.FRAC_LAYERS;
      if (bytes.length < expected) {
        throw new RangeError(
          `[HPDC8] fromBytes needs at least ${expected} bytes, got ${bytes.length}.`
        );
      }

      const sign = bytes[0] & 0x01;
      let levelVal = 0n;
      for (let i = 1; i <= 8; i++) {
        levelVal = (levelVal << 8n) | BigInt(bytes[i]);
      }
      const intPart = bytes[9] & 0xFF;
      const frac = new Uint8Array(CONFIG.FRAC_LAYERS);
      for (let i = 0; i < CONFIG.FRAC_LAYERS; i++) {
        frac[i] = bytes[10 + i] || 0;
      }

      const targetMode = mode || CONFIG.DEFAULT_MODE;
      return new HPDC8({
        mode: targetMode,
        sign,
        level: (targetMode === HPDC8.MODE_HC_ONLY) ? 0n : levelVal,
        int_part: intPart,
        frac: frac
      });
    }

    /* ----------------------------------------------------------
       构造器: fromObject —— 从普通对象恢复（如 localStorage JSON）
       ---------------------------------------------------------- */
    static fromObject(obj) {
      if (!obj || typeof obj !== 'object') {
        throw new TypeError('[HPDC8] fromObject expects an object.');
      }
      return new HPDC8({
        mode: obj.mode,
        sign: obj.sign,
        level: obj.level !== undefined ? BigInt(obj.level) : 0n,
        int_part: obj.int_part,
        frac: obj.frac ? new Uint8Array(obj.frac) : undefined
      });
    }

    /* ----------------------------------------------------------
       序列化
       ---------------------------------------------------------- */
    serialize() {
      return {
        mode: this.mode,
        sign: this.sign,
        level: this.level.toString(),
        int_part: this.int_part,
        frac: Array.from(this.frac)
      };
    }

    toBytes() {
      const buf = new Uint8Array(1 + 8 + 1 + CONFIG.FRAC_LAYERS);
      buf[0] = this.sign & 0x01;
      let lv = this.level;
      for (let i = 8; i >= 1; i--) {
        buf[i] = Number(lv & 0xFFn);
        lv = lv >> 8n;
      }
      buf[9] = this.int_part & 0xFF;
      for (let i = 0; i < CONFIG.FRAC_LAYERS; i++) {
        buf[10 + i] = this.frac[i];
      }
      return buf;
    }

    clone() {
      return new HPDC8({
        mode: this.mode,
        sign: this.sign,
        level: this.level,
        int_part: this.int_part,
        frac: new Uint8Array(this.frac)
      });
    }

    /* ----------------------------------------------------------
       与普通数值互转（调试用）
       ---------------------------------------------------------- */
    toNumber() {
      // 注意: level 超过 2^53 时 Number() 会丢失精度，仅用于调试
      let fracVal = 0;
      let divisor = 256;
      for (let i = 0; i < CONFIG.FRAC_LAYERS; i++) {
        fracVal += this.frac[i] / divisor;
        divisor *= 256;
      }
      let val = Number(this.level) * 256 + this.int_part + fracVal;
      return (this.sign === 1) ? -val : val;
    }

    toLegacyNumber() {
      console.warn(
        '[HPDC8] toLegacyNumber() is deprecated. ' +
        'Use toNumber() for debugging only.'
      );
      return this.toNumber();
    }

    // 还原为 [0,1] 置信度（仅 HC 模式有效；异常评分均使用 HC_ONLY，level=0）
    toConfidence() {
      return this.toNumber() / 256;
    }

    /* ----------------------------------------------------------
       核心: 比较（确定性字典序，超度量距离）
       ---------------------------------------------------------- */
    compare(other) {
      assertHPDC8(other, 'compare');
      assertSameLayerCount(this, other);

      // 统一转换为合体语义后比较
      const a = (this.mode === HPDC8.MODE_HYBRID) ? this : normalizeToHybrid(this);
      const b = (other.mode === HPDC8.MODE_HYBRID) ? other : normalizeToHybrid(other);

      // 符号不同: 负 < 正
      if (a.sign !== b.sign) {
        return (a.sign === 1) ? -1 : 1;
      }

      // 同号时比较绝对值，再根据符号翻转
      const cmp = HPDC8._compareAbs(a, b);
      return (a.sign === 1) ? -cmp : cmp;
    }

    /* ----------------------------------------------------------
       静态比较：供外部以 HPDC8.compare(a, b) 形式调用
       （与实例方法 a.compare(b) 等价）
       ---------------------------------------------------------- */
    static compare(a, b) {
      return a.compare(b);
    }

    static _compareAbs(a, b) {
      if (a.level !== b.level) {
        return (a.level < b.level) ? -1 : 1;
      }
      if (a.int_part !== b.int_part) {
        return (a.int_part < b.int_part) ? -1 : 1;
      }
      for (let i = 0; i < CONFIG.FRAC_LAYERS; i++) {
        if (a.frac[i] !== b.frac[i]) {
          return (a.frac[i] < b.frac[i]) ? -1 : 1;
        }
      }
      return 0;
    }

    /* ----------------------------------------------------------
       核心: 仅 HC 饱和加法（置信度累加场景）
       ---------------------------------------------------------- */
    static addHCOnly(a, b, options) {
      assertHPDC8(a, 'addHCOnly');
      assertHPDC8(b, 'addHCOnly');
      assertSameLayerCount(a, b);

      const saturate = (options && options.saturate !== undefined)
        ? options.saturate
        : CONFIG.SATURATION;

      const x = (a.mode === HPDC8.MODE_HC_ONLY) ? a : normalizeToHybrid(a);
      const y = (b.mode === HPDC8.MODE_HC_ONLY) ? b : normalizeToHybrid(b);

      // 小数层带进位（从最低层开始）
      let carry = 0;
      const newFrac = new Uint8Array(CONFIG.FRAC_LAYERS);
      for (let i = CONFIG.FRAC_LAYERS - 1; i >= 0; i--) {
        const sum = x.frac[i] + y.frac[i] + carry;
        newFrac[i] = sum & 0xFF;
        carry = sum >> 8;
      }

      const intSum = x.int_part + y.int_part + carry;
      let intPartFinal;
      if (saturate) {
        intPartFinal = (intSum > 255) ? 255 : (intSum & 0xFF);
      } else {
        intPartFinal = intSum & 0xFF; // 模 256 回绕
      }

      return new HPDC8({
        mode: HPDC8.MODE_HC_ONLY,
        sign: 0, // HC_ONLY 置信度场景默认非负
        level: 0n,
        int_part: intPartFinal,
        frac: newFrac
      });
    }

    /* ----------------------------------------------------------
       核心: 合体进位加法（完整进位到 level）
       ---------------------------------------------------------- */
    static addLeveled(a, b) {
      assertHPDC8(a, 'addLeveled');
      assertHPDC8(b, 'addLeveled');
      assertSameLayerCount(a, b);

      const x = (a.mode === HPDC8.MODE_HYBRID) ? a : normalizeToHybrid(a);
      const y = (b.mode === HPDC8.MODE_HYBRID) ? b : normalizeToHybrid(b);

      // 符号处理: 同号相加，异号转减法
      if (x.sign !== y.sign) {
        // 异号: 转化为绝对值相减
        const cmp = HPDC8._compareAbs(x, y);
        if (cmp === 0) {
          return new HPDC8({
            mode: HPDC8.MODE_HYBRID,
            sign: 0,
            level: 0n,
            int_part: 0,
            frac: new Uint8Array(CONFIG.FRAC_LAYERS)
          });
        }
        const larger  = (cmp > 0) ? x : y;
        const smaller = (cmp > 0) ? y : x;
        const diff = HPDC8._subtractAbs(larger, smaller);
        return new HPDC8({
          mode: HPDC8.MODE_HYBRID,
          sign: larger.sign,
          level: diff.level,
          int_part: diff.int_part,
          frac: diff.frac
        });
      }

      // 同号: 绝对值相加，保留符号
      let carry = 0;
      const newFrac = new Uint8Array(CONFIG.FRAC_LAYERS);
      for (let i = CONFIG.FRAC_LAYERS - 1; i >= 0; i--) {
        const sum = x.frac[i] + y.frac[i] + carry;
        newFrac[i] = sum & 0xFF;
        carry = sum >> 8;
      }

      const intSum = x.int_part + y.int_part + carry;
      const carryToLevel = intSum >> 8;
      const intPartFinal = intSum & 0xFF;
      const newLevel = x.level + y.level + BigInt(carryToLevel);

      return new HPDC8({
        mode: HPDC8.MODE_HYBRID,
        sign: x.sign,
        level: newLevel,
        int_part: intPartFinal,
        frac: newFrac
      });
    }

    /* ----------------------------------------------------------
       内部: 绝对值减法（addLeveled 异号时使用）
       ---------------------------------------------------------- */
    static _subtractAbs(a, b) {
      // 前提: a >= b（绝对值）
      let borrow = 0;
      const newFrac = new Uint8Array(CONFIG.FRAC_LAYERS);
      for (let i = CONFIG.FRAC_LAYERS - 1; i >= 0; i--) {
        let diff = a.frac[i] - b.frac[i] - borrow;
        if (diff < 0) {
          diff += 256;
          borrow = 1;
        } else {
          borrow = 0;
        }
        newFrac[i] = diff & 0xFF;
      }

      let intDiff = a.int_part - b.int_part - borrow;
      let levelDiff = a.level - b.level;
      if (intDiff < 0) {
        intDiff += 256;
        levelDiff -= 1n;
      }

      return {
        level: levelDiff,
        int_part: intDiff & 0xFF,
        frac: newFrac
      };
    }
  }

  /* ============================================================
     辅助函数
     ============================================================ */
  function normalizeToHybrid(hpdc) {
    assertHPDC8(hpdc, 'normalizeToHybrid');

    if (hpdc.mode === HPDC8.MODE_HYBRID) return hpdc;

    if (hpdc.mode === HPDC8.MODE_HC_ONLY) {
      return new HPDC8({
        mode: HPDC8.MODE_HYBRID,
        sign: hpdc.sign,
        level: 0n,
        int_part: hpdc.int_part,
        frac: new Uint8Array(hpdc.frac)
      });
    }

    if (hpdc.mode === HPDC8.MODE_LEVEL_ONLY) {
      const emptyFrac = new Uint8Array(CONFIG.FRAC_LAYERS);
      return new HPDC8({
        mode: HPDC8.MODE_HYBRID,
        sign: hpdc.sign,
        level: hpdc.level,
        int_part: 0,
        frac: emptyFrac
      });
    }

    return hpdc;
  }

  function compareHpdc(a, b) {
    assertHPDC8(a, 'compareHpdc');
    assertHPDC8(b, 'compareHpdc');
    return a.compare(b);
  }

  function addHpdc(a, b, mode) {
    assertHPDC8(a, 'addHpdc');
    assertHPDC8(b, 'addHpdc');
    if (mode === HPDC8.MODE_HC_ONLY) {
      return HPDC8.addHCOnly(a, b);
    }
    return HPDC8.addLeveled(a, b);
  }

  /* ============================================================
     挂载到全局
     ============================================================ */
  global.HPDC = {
    HPDC8: HPDC8,
    CONFIG: CONFIG,
    normalizeToHybrid: normalizeToHybrid,
    compare: compareHpdc,
    add: addHpdc,
    // 版本标记，供外部检测
    __version: '8.9.0-p0'
  };

})(typeof window !== 'undefined' ? window : globalThis);
