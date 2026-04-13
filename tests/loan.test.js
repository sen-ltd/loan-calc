import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  monthlyPayment,
  amortizationSchedule,
  totalInterest,
  earlyPayoff,
  earlyPayoffFromParams,
  formatCurrency,
} from '../src/loan.js';

// ─── monthlyPayment ───────────────────────────────────────────────────────────

describe('monthlyPayment', () => {
  it('classic 100k @ 5% / 30yr ≈ $536.82', () => {
    const mp = monthlyPayment(100_000, 0.05, 360);
    assert.ok(Math.abs(mp - 536.82) < 0.01, `expected ~536.82, got ${mp.toFixed(2)}`);
  });

  it('200k @ 3% / 25yr', () => {
    const mp = monthlyPayment(200_000, 0.03, 300);
    assert.ok(mp > 900 && mp < 1000, `payment out of range: ${mp}`);
  });

  it('zero interest returns principal / months', () => {
    const mp = monthlyPayment(12_000, 0, 12);
    assert.equal(mp, 1000);
  });

  it('zero principal returns 0', () => {
    assert.equal(monthlyPayment(0, 0.05, 120), 0);
  });

  it('zero months returns 0', () => {
    assert.equal(monthlyPayment(100_000, 0.05, 0), 0);
  });

  it('1-month loan equals principal + 1 month interest', () => {
    const mp = monthlyPayment(12_000, 0.12, 1);
    const expected = 12_000 * (1 + 0.12 / 12);
    assert.ok(Math.abs(mp - expected) < 0.01);
  });
});

// ─── amortizationSchedule — equal-installment ────────────────────────────────

describe('amortizationSchedule (equal-installment)', () => {
  const schedule = amortizationSchedule(100_000, 0.05, 360);

  it('has 360 rows', () => {
    assert.equal(schedule.length, 360);
  });

  it('first row has correct month number', () => {
    assert.equal(schedule[0].month, 1);
  });

  it('balance ends at 0', () => {
    assert.ok(schedule[schedule.length - 1].balance < 0.01);
  });

  it('all payments are approximately equal', () => {
    const payments = schedule.map((r) => r.payment);
    const min = Math.min(...payments);
    const max = Math.max(...payments);
    // Last payment may differ slightly; check all except last
    const inner = payments.slice(0, -1);
    const iMin = Math.min(...inner);
    const iMax = Math.max(...inner);
    assert.ok(iMax - iMin < 0.01, `payments not equal: ${iMin} – ${iMax}`);
  });

  it('sum of principalPaid equals original principal', () => {
    const totalPrincipal = schedule.reduce((s, r) => s + r.principalPaid, 0);
    assert.ok(Math.abs(totalPrincipal - 100_000) < 0.01);
  });

  it('interest portion decreases over time', () => {
    assert.ok(schedule[0].interestPaid > schedule[180].interestPaid);
    assert.ok(schedule[180].interestPaid > schedule[359].interestPaid);
  });

  it('principal portion increases over time', () => {
    assert.ok(schedule[0].principalPaid < schedule[180].principalPaid);
  });
});

// ─── amortizationSchedule — equal-principal ───────────────────────────────────

describe('amortizationSchedule (equal-principal)', () => {
  const schedule = amortizationSchedule(100_000, 0.05, 120, 'equal-principal');

  it('has 120 rows', () => {
    assert.equal(schedule.length, 120);
  });

  it('balance ends at 0', () => {
    assert.ok(schedule[schedule.length - 1].balance < 0.01);
  });

  it('principal portion is approximately constant', () => {
    const expected = 100_000 / 120;
    // All but last row
    for (let i = 0; i < schedule.length - 1; i++) {
      assert.ok(
        Math.abs(schedule[i].principalPaid - expected) < 0.01,
        `row ${i}: principal ${schedule[i].principalPaid} ≠ ${expected}`,
      );
    }
  });

  it('payments decrease over time (first > last)', () => {
    assert.ok(schedule[0].payment > schedule[schedule.length - 1].payment);
  });

  it('sum of principalPaid equals original principal', () => {
    const totalPrincipal = schedule.reduce((s, r) => s + r.principalPaid, 0);
    assert.ok(Math.abs(totalPrincipal - 100_000) < 0.01);
  });
});

// ─── totalInterest ────────────────────────────────────────────────────────────

describe('totalInterest', () => {
  it('is positive for non-zero rate', () => {
    const ti = totalInterest(100_000, 0.05, 360);
    assert.ok(ti > 0);
  });

  it('is 0 for zero rate', () => {
    const ti = totalInterest(100_000, 0, 120);
    assert.ok(Math.abs(ti) < 0.01);
  });

  it('equal-principal pays less total interest than equal-installment', () => {
    const tiEI = totalInterest(100_000, 0.05, 120);
    const tiEP = totalInterest(100_000, 0.05, 120, 'equal-principal');
    assert.ok(tiEP < tiEI, `equal-principal (${tiEP}) should be < equal-installment (${tiEI})`);
  });

  it('longer term → more total interest', () => {
    const ti10 = totalInterest(100_000, 0.05, 120);
    const ti20 = totalInterest(100_000, 0.05, 240);
    assert.ok(ti20 > ti10);
  });
});

// ─── earlyPayoff ──────────────────────────────────────────────────────────────

describe('earlyPayoff', () => {
  it('extra payment reduces term', () => {
    const schedule = amortizationSchedule(100_000, 0.05, 360);
    const ep = earlyPayoff(schedule, 200);
    assert.ok(ep.newTerm < 360, `newTerm ${ep.newTerm} should be < 360`);
  });

  it('extra payment produces positive interest savings', () => {
    const schedule = amortizationSchedule(100_000, 0.05, 360);
    const ep = earlyPayoff(schedule, 200);
    assert.ok(ep.interestSaved > 0);
  });

  it('zero extra returns original term', () => {
    const schedule = amortizationSchedule(100_000, 0.05, 120);
    const ep = earlyPayoff(schedule, 0);
    assert.equal(ep.newTerm, 120);
  });

  it('newSchedule array has correct length', () => {
    const schedule = amortizationSchedule(50_000, 0.04, 60);
    const ep = earlyPayoff(schedule, 500);
    assert.equal(ep.newSchedule.length, ep.newTerm);
  });
});

// ─── earlyPayoffFromParams ────────────────────────────────────────────────────

describe('earlyPayoffFromParams', () => {
  it('extra payment shortens term', () => {
    const ep = earlyPayoffFromParams(100_000, 0.05, 360, 200);
    assert.ok(ep.newTerm < 360);
  });

  it('interest savings are positive', () => {
    const ep = earlyPayoffFromParams(100_000, 0.05, 360, 200);
    assert.ok(ep.interestSaved > 0);
  });

  it('works for equal-principal type', () => {
    const ep = earlyPayoffFromParams(100_000, 0.05, 120, 300, 'equal-principal');
    assert.ok(ep.newTerm < 120);
    assert.ok(ep.interestSaved > 0);
  });

  it('zero extra returns original months', () => {
    const ep = earlyPayoffFromParams(100_000, 0.05, 240, 0);
    assert.equal(ep.newTerm, 240);
    assert.equal(ep.interestSaved, 0);
  });

  it('very large extra payment terminates quickly', () => {
    const ep = earlyPayoffFromParams(100_000, 0.05, 360, 100_000);
    assert.equal(ep.newTerm, 1);
  });
});

// ─── formatCurrency ───────────────────────────────────────────────────────────

describe('formatCurrency', () => {
  it('formats JPY without decimals', () => {
    const s = formatCurrency(100000, 'JPY');
    assert.ok(s.includes('100,000') || s.includes('100000'), `got: ${s}`);
    assert.ok(!s.includes('.'), `should not include decimal: ${s}`);
  });

  it('formats USD with 2 decimals', () => {
    const s = formatCurrency(1234.5, 'USD');
    assert.ok(s.includes('1,234.50') || s.includes('1234.50'), `got: ${s}`);
  });

  it('formats zero', () => {
    const s = formatCurrency(0, 'JPY');
    assert.ok(s.includes('0'), `got: ${s}`);
  });

  it('formats large JPY amount', () => {
    const s = formatCurrency(30_000_000, 'JPY');
    assert.ok(s.includes('30,000,000') || s.includes('30000000'), `got: ${s}`);
  });
});

// ─── edge cases ───────────────────────────────────────────────────────────────

describe('edge cases', () => {
  it('very short term (1 month)', () => {
    const s = amortizationSchedule(10_000, 0.05, 1);
    assert.equal(s.length, 1);
    assert.ok(s[0].balance < 0.01);
  });

  it('very small amount (¥1000)', () => {
    const mp = monthlyPayment(1000, 0.05, 12);
    assert.ok(mp > 0 && mp < 200);
  });

  it('very long term (40 years)', () => {
    const mp = monthlyPayment(30_000_000, 0.02, 480);
    assert.ok(mp > 0 && mp < 200_000);
  });

  it('schedule balance never goes negative', () => {
    const schedule = amortizationSchedule(50_000, 0.03, 60);
    schedule.forEach((row) => {
      assert.ok(row.balance >= -0.01, `negative balance at month ${row.month}: ${row.balance}`);
    });
  });
});
