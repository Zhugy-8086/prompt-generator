/**
 * modules/domain-voter.js
 * 领域投票累加器（DomainVoter）
 * 版本: V8.9-P3
 * 职责: 将多个词的领域置信度按领域累加，选出置信度最高的前 N 个领域。
 * 依赖: modules/hpdc-core.js（必须在之前加载）
 * 挂载: window.DomainVoter（类）, window.__DomainVoterUtils（辅助函数）
 */

(function(global) {
  'use strict';

  /* ============================================================
     环境检测
     ============================================================ */
  if (!global.HPDC || !global.HPDC.HPDC8) {
    throw new Error(
      '[DomainVoter] HPDC8 class is required. ' +
      'Please load modules/hpdc-core.js before domain-voter.js.'
    );
  }

  const HPDC8 = global.HPDC.HPDC8;

  /* ============================================================
     类: DomainVoter
     ============================================================ */
  class DomainVoter {
    constructor(options) {
      options = options || {};
      this.mode = options.mode || HPDC8.MODE_HC_ONLY; // 'HC_ONLY' 或 'HYBRID'
      this.saturate = options.saturate !== false;      // 默认 true
      this.accumulator = new Map();                    // domainName -> HPDC8
    }

    /* ----------------------------------------------------------
       单票添加
       ---------------------------------------------------------- */
    addVote(domain, confidenceHpdc) {
      if (typeof domain !== 'string' || domain.length === 0) {
        console.warn('[DomainVoter] addVote ignored: invalid domain string.');
        return;
      }

      // 类型兼容：如果不是 HPDC8，尝试按置信度数值转换
      let hpdc = confidenceHpdc;
      if (!(hpdc instanceof HPDC8)) {
        const num = Number(confidenceHpdc);
        if (!isNaN(num) && num >= 0 && num <= 1) {
          hpdc = HPDC8.fromConfidence(num);
        } else {
          console.warn(
            '[DomainVoter] addVote ignored: confidenceHpdc is not an HPDC8 instance ' +
            'and cannot be converted from a confidence number (0~1).'
          );
          return;
        }
      }

      if (!this.accumulator.has(domain)) {
        this.accumulator.set(domain, hpdc.clone());
      } else {
        const old = this.accumulator.get(domain);
        let newVal;
        if (this.mode === HPDC8.MODE_HC_ONLY) {
          newVal = HPDC8.addHCOnly(old, hpdc, { saturate: this.saturate });
        } else {
          newVal = HPDC8.addLeveled(old, hpdc);
        }
        this.accumulator.set(domain, newVal);
      }
    }

    /* ----------------------------------------------------------
       批量添加（Object 或 Map）
       ---------------------------------------------------------- */
    addVoteMap(confidenceMap) {
      if (!confidenceMap) return;
      const entries = (confidenceMap instanceof Map)
        ? Array.from(confidenceMap.entries())
        : Object.entries(confidenceMap);

      for (let i = 0; i < entries.length; i++) {
        const [domain, hpdc] = entries[i];
        this.addVote(domain, hpdc);
      }
    }

    /* ----------------------------------------------------------
       获取前 N 领域（按置信度降序）
       ---------------------------------------------------------- */
    getTopDomains(n) {
      const count = (typeof n === 'number' && n > 0) ? n : 2;
      if (this.accumulator.size === 0) return [];

      const entries = Array.from(this.accumulator.entries());
      entries.sort(function(a, b) {
        const cmp = HPDC8.compare(b[1], a[1]); // 降序
        if (cmp !== 0) return cmp;
        // 二级排序键：领域名字符串，确保确定性（避免 sort 不稳定）
        return a[0].localeCompare(b[0]);
      });

      return entries.slice(0, count).map(function(item) {
        return { domain: item[0], confidence: item[1] };
      });
    }

    /* ----------------------------------------------------------
       获取第一名（简写）
       ---------------------------------------------------------- */
    getTopDomain() {
      const tops = this.getTopDomains(1);
      return tops.length ? tops[0] : null;
    }

    /* ----------------------------------------------------------
       重置累加器
       ---------------------------------------------------------- */
    reset() {
      this.accumulator.clear();
    }

    /* ----------------------------------------------------------
       调试快照
       ---------------------------------------------------------- */
    getState() {
      const domains = {};
      this.accumulator.forEach(function(hpdc, domain) {
        domains[domain] = hpdc.toNumber();
      });
      return {
        mode: this.mode,
        saturate: this.saturate,
        domainCount: this.accumulator.size,
        domains: domains
      };
    }
  }

  /* ============================================================
     辅助工厂函数
     ============================================================ */
  function createVoterFromWordList(wordList, dictionaries, options) {
    if (!Array.isArray(wordList)) {
      throw new TypeError('[DomainVoter] createVoterFromWordList expects an Array.');
    }
    const dict = dictionaries || global.Dictionaries;
    if (!dict || typeof dict.getDomainConfidence !== 'function') {
      throw new Error(
        '[DomainVoter] createVoterFromWordList requires a dictionaries object ' +
        'with getDomainConfidence method.'
      );
    }

    const voter = new DomainVoter(options);
    for (let i = 0; i < wordList.length; i++) {
      const word = wordList[i];
      const confMap = dict.getDomainConfidence(word);
      if (confMap && Object.keys(confMap).length) {
        voter.addVoteMap(confMap);
      }
    }
    return voter;
  }

  /* ============================================================
     挂载到全局
     ============================================================ */
  global.DomainVoter = DomainVoter;
  global.__DomainVoterUtils = {
    createVoterFromWordList: createVoterFromWordList,
    __version: '8.9.0-p3'
  };

})(typeof window !== 'undefined' ? window : globalThis);
