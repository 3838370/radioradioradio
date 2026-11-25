// TestRunner: a tiny in-browser test harness. Results are printed into #results and
// exposed as window.testResults for automated checks.
RA.TestRunner = class TestRunner {
  constructor() {
    this.tests = [];
  }

  test(name, fn) { this.tests.push({ name, fn }); }

  static assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }

  static equal(a, b, msg) {
    if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg || 'not equal'}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`);
  }

  async run(el) {
    const results = [];
    for (const t of this.tests) {
      try {
        const detail = await t.fn();
        results.push({ name: t.name, ok: true, detail: detail || '' });
      } catch (e) {
        results.push({ name: t.name, ok: false, detail: e.message });
      }
    }
    const failed = results.filter((r) => !r.ok).length;
    el.innerHTML = `<h2>${results.length - failed}/${results.length} passed</h2>` + results.map((r) =>
      `<div class="${r.ok ? 'ok' : 'fail'}">${r.ok ? '✓' : '✗'} ${r.name}${r.detail ? ` <span>— ${r.detail}</span>` : ''}</div>`).join('');
    window.testResults = { passed: results.length - failed, failed, results };
    return results;
  }
};
