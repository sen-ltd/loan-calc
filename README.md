# ローン計算機 — Loan Calculator

住宅ローン・カーローン・教育ローンに対応したシンプルな計算機。  
A simple loan/mortgage calculator supporting equal-installment and equal-principal repayment methods.

**Demo**: https://sen.ltd/portfolio/loan-calc/

---

## Features / 機能

- **元利均等返済** (Equal Installments) — fixed monthly payment
- **元金均等返済** (Equal Principal) — fixed principal portion, decreasing payment
- **償還予定表** (Amortization Schedule) — full month-by-month breakdown
- **繰上返済シミュレーション** (Prepayment Simulation) — see term reduction and interest saved
- **グラフ** (Chart) — CSS bar chart of principal vs interest over time
- **日英対応** (Japanese / English UI)
- **ダーク / ライトモード** (Dark / Light Theme)
- Zero dependencies, no build step

---

## Getting Started

```bash
# Clone and serve locally
git clone https://github.com/sen-ltd/loan-calc.git
cd loan-calc
python3 -m http.server 8080
# Open http://localhost:8080
```

---

## Running Tests

```bash
node --test tests/*.test.js
```

Tests cover 39 cases including known loan calculations, edge cases, and prepayment simulation.

---

## File Structure

```
loan-calc/
├── index.html          # Single-page app
├── style.css           # CSS with design tokens, dark/light theme
├── src/
│   ├── loan.js         # Core math (no DOM dependencies)
│   ├── main.js         # DOM / event handling / rendering
│   └── i18n.js         # Japanese / English translations
├── tests/
│   └── loan.test.js    # 39 unit tests (node:test)
├── package.json
├── LICENSE
└── README.md
```

---

## Formulas

### Equal Installments (元利均等)

```
r = APR / 12
P = L × r / (1 − (1 + r)^−n)
```

### Equal Principal (元金均等)

```
Principal portion per month = L / n
Interest portion = remaining balance × r
```

---

## License

MIT © 2026 [SEN LLC (SEN 合同会社)](https://sen.ltd)
