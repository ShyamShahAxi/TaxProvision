/* AxiCorp Pte Ltd (SG) USD - AUS155 trial balance, FY26 (1 Jul 2025 -> 30 Jun 2026).
   Sorted by account number. Full precision (2 dp) from the source export; amounts unedited. */
'use strict';
const AUS155_TB = [
    {
        "code":  "100300",
        "name":  "Broker Cash",
        "opening":  3883.57,
        "debit":  2171.71,
        "credit":  2232.2,
        "closing":  3823.08
    },
    {
        "code":  "100320",
        "name":  "Broker Unrealised",
        "opening":  -1291119.14,
        "debit":  1291119.14,
        "credit":  0,
        "closing":  0
    },
    {
        "code":  "100330",
        "name":  "Broker Derivatives",
        "opening":  4130510.43,
        "debit":  270755.78,
        "credit":  4405004.24,
        "closing":  -3738.03
    },
    {
        "code":  "100370",
        "name":  "Broker Derivative Assets",
        "opening":  2838373.59,
        "debit":  4432961.07,
        "credit":  4680447.2,
        "closing":  2590887.46
    },
    {
        "code":  "100500-AU1",
        "name":  "DBS Corporate AUD 0003-032990-01-7",
        "opening":  -145.56,
        "debit":  236.26,
        "credit":  90.7,
        "closing":  0
    },
    {
        "code":  "100500-AU2",
        "name":  "DBS Corporate AUD 0003-032990-01-7",
        "opening":  4829.32,
        "debit":  5616.12,
        "credit":  5699.95,
        "closing":  4745.49
    },
    {
        "code":  "100500-SG1",
        "name":  "DBS Corporate SGD 003-941456-0",
        "opening":  146.43,
        "debit":  91.1,
        "credit":  93.64,
        "closing":  143.89
    },
    {
        "code":  "100500-SG2",
        "name":  "DBS Corporate SGD 003-941456-0",
        "opening":  734869.63,
        "debit":  38803436.26,
        "credit":  38920575.02,
        "closing":  617730.87
    },
    {
        "code":  "100500-US2",
        "name":  "DBS Corporate USD 007-208775-001-3022",
        "opening":  127020.24,
        "debit":  4570344.91,
        "credit":  4660355.34,
        "closing":  37009.81
    },
    {
        "code":  "100500-US3",
        "name":  "AxiCorp Pte - Spenmo Corp Card Facility - USD",
        "opening":  0.03,
        "debit":  0,
        "credit":  0.03,
        "closing":  0
    },
    {
        "code":  "110300-000",
        "name":  "IC-R AxiCorp Financial Services Pty Ltd",
        "opening":  0.02,
        "debit":  589593405.24,
        "credit":  589593405.26,
        "closing":  0
    },
    {
        "code":  "110300-001",
        "name":  "IC-R AxiCorp Financial Services Pty Limited (DIFC)",
        "opening":  0.01,
        "debit":  616802.65,
        "credit":  616802.66,
        "closing":  0
    },
    {
        "code":  "110300-005",
        "name":  "IC-R AxiCorp Financial Services Pty Ltd USD",
        "opening":  834449.01,
        "debit":  65409944.78,
        "credit":  66244393.79,
        "closing":  0
    },
    {
        "code":  "110300-006",
        "name":  "IC-R AxiCorp Financial Services Pty Ltd (DIFC) USD",
        "opening":  16818.36,
        "debit":  84091.87,
        "credit":  100910.23,
        "closing":  0
    },
    {
        "code":  "110300-015",
        "name":  "IC-R AxiForex Limited (NZ) USD",
        "opening":  0.19,
        "debit":  0.93,
        "credit":  1.12,
        "closing":  0
    },
    {
        "code":  "110300-020",
        "name":  "IC-R AxiCorp Limited",
        "opening":  0.03,
        "debit":  176257277.54,
        "credit":  176257277.57,
        "closing":  0
    },
    {
        "code":  "110300-025",
        "name":  "IC-R AxiCorp Limited USD",
        "opening":  0.27,
        "debit":  60385.08,
        "credit":  60385.35,
        "closing":  0
    },
    {
        "code":  "110300-035",
        "name":  "IC-R Topaxi Pty Ltd USD",
        "opening":  445.18,
        "debit":  2269.33,
        "credit":  2714.51,
        "closing":  0
    },
    {
        "code":  "110300-045",
        "name":  "IC-R Axi Technologies India USD",
        "opening":  190894,
        "debit":  4797632.97,
        "credit":  4988526.97,
        "closing":  0
    },
    {
        "code":  "110300-075",
        "name":  "IC-R AxiFinancial Corporation Pty Ltd USD",
        "opening":  0.06,
        "debit":  970564.29,
        "credit":  970564.35,
        "closing":  0
    },
    {
        "code":  "110300-145",
        "name":  "IC-R ForexConvert Pty Ltd (aka AxiTechnology) USD",
        "opening":  0.26,
        "debit":  1.46,
        "credit":  1.72,
        "closing":  0
    },
    {
        "code":  "110300-155",
        "name":  "IC-R AXICORP PTE. LTD (USD)",
        "opening":  0.04,
        "debit":  0,
        "credit":  0,
        "closing":  0.04
    },
    {
        "code":  "110300-160",
        "name":  "IC-R Axi Corp China",
        "opening":  0.01,
        "debit":  173235.95,
        "credit":  173235.96,
        "closing":  0
    },
    {
        "code":  "110300-170",
        "name":  "IC-R Solaris EMEA Limited",
        "opening":  -0.01,
        "debit":  1640343.86,
        "credit":  1640343.85,
        "closing":  0
    },
    {
        "code":  "110300-175",
        "name":  "IC-R Solaris EMEA Limited USD",
        "opening":  107481.75,
        "debit":  14789108.49,
        "credit":  14896590.24,
        "closing":  0
    },
    {
        "code":  "110300-180",
        "name":  "IC-R AxiTrade Limited (SVG)",
        "opening":  418772415.95,
        "debit":  5199918388.45,
        "credit":  4967527495.45,
        "closing":  651163308.95
    },
    {
        "code":  "110300-255",
        "name":  "IC-R PsyQuation Pty Ltd USD",
        "opening":  0.02,
        "debit":  0.1,
        "credit":  0.12,
        "closing":  0
    },
    {
        "code":  "110300-300",
        "name":  "IC-R Star Financial Systems",
        "opening":  -0.01,
        "debit":  5260690.93,
        "credit":  5260690.92,
        "closing":  0
    },
    {
        "code":  "110300-305",
        "name":  "IC-R Star Financial Systems USD",
        "opening":  13809.23,
        "debit":  969081.25,
        "credit":  982890.48,
        "closing":  0
    },
    {
        "code":  "110300-502",
        "name":  "IC-R CB Financial Services Rep Office (Dubai)",
        "opening":  0.4,
        "debit":  14854.39,
        "credit":  14854.79,
        "closing":  0
    },
    {
        "code":  "110300-503",
        "name":  "IC-R One Financial Markets Asia Limited (HK)",
        "opening":  0.12,
        "debit":  13099.26,
        "credit":  13099.38,
        "closing":  0
    },
    {
        "code":  "110300-504",
        "name":  "IC-R One Financial Consulting Services Limited (China)",
        "opening":  0.01,
        "debit":  580849.57,
        "credit":  580849.58,
        "closing":  0
    },
    {
        "code":  "110800",
        "name":  "Client derivative assets",
        "opening":  77361841.28,
        "debit":  84351604.23,
        "credit":  80691733.1,
        "closing":  81021712.41
    },
    {
        "code":  "115100",
        "name":  "Deposits, Security and Bank Guarantees",
        "opening":  133694.22,
        "debit":  7235636.26,
        "credit":  7217263.66,
        "closing":  152066.82
    },
    {
        "code":  "120100",
        "name":  "Prepayments",
        "opening":  48025.47,
        "debit":  405304.44,
        "credit":  427610.31,
        "closing":  25719.6
    },
    {
        "code":  "120500",
        "name":  "Employee loans",
        "opening":  0.08,
        "debit":  256.38,
        "credit":  256.46,
        "closing":  0
    },
    {
        "code":  "120600",
        "name":  "GST / VAT",
        "opening":  82852.04,
        "debit":  154468.78,
        "credit":  118058.39,
        "closing":  119262.43
    },
    {
        "code":  "120700",
        "name":  "Other Debtors",
        "opening":  195391.46,
        "debit":  11831.89,
        "credit":  21221.54,
        "closing":  186001.81
    },
    {
        "code":  "130100",
        "name":  "Current Tax Assets - tax receivable - prior year",
        "opening":  0,
        "debit":  1267076.93,
        "credit":  1301102.94,
        "closing":  -34026.01
    },
    {
        "code":  "130200",
        "name":  "Current Tax Assets - tax receivable - current year",
        "opening":  736343.89,
        "debit":  3244589.82,
        "credit":  1565844.82,
        "closing":  2415088.89
    },
    {
        "code":  "140100",
        "name":  "Computer Equipment - Cost",
        "opening":  347044.31,
        "debit":  177802.1,
        "credit":  0,
        "closing":  524846.41
    },
    {
        "code":  "140110",
        "name":  "Computer Equipment - Acc Depreciation",
        "opening":  -269156.18,
        "debit":  0,
        "credit":  78098.75,
        "closing":  -347254.93
    },
    {
        "code":  "140120",
        "name":  "Asset clearing account",
        "opening":  0.01,
        "debit":  20148216.36,
        "credit":  20148189.19,
        "closing":  27.18
    },
    {
        "code":  "140200",
        "name":  "Furniture and Equipment - Cost",
        "opening":  26600.16,
        "debit":  0,
        "credit":  0,
        "closing":  26600.16
    },
    {
        "code":  "140210",
        "name":  "Furniture and Equipment - Acc Depreciation",
        "opening":  -26600.16,
        "debit":  0,
        "credit":  0,
        "closing":  -26600.16
    },
    {
        "code":  "140220",
        "name":  "Fixtures and Fittings - Cost",
        "opening":  22933.77,
        "debit":  0,
        "credit":  0,
        "closing":  22933.77
    },
    {
        "code":  "140230",
        "name":  "Fixtures and Fittings - Acc Depreciation",
        "opening":  -22933.77,
        "debit":  0,
        "credit":  0,
        "closing":  -22933.77
    },
    {
        "code":  "140300",
        "name":  "ROU Asset at Cost",
        "opening":  1139358.45,
        "debit":  1271242.59,
        "credit":  0,
        "closing":  2410601.04
    },
    {
        "code":  "140310",
        "name":  "ROU Asset Acc Dep",
        "opening":  -959256.76,
        "debit":  0,
        "credit":  340329.27,
        "closing":  -1299586.03
    },
    {
        "code":  "140320",
        "name":  "Leasehold Improvement - Cost",
        "opening":  68047.5,
        "debit":  0,
        "credit":  0,
        "closing":  68047.5
    },
    {
        "code":  "140330",
        "name":  "Leasehold Improvement - Acc Depreciation",
        "opening":  -68047.5,
        "debit":  0,
        "credit":  0,
        "closing":  -68047.5
    },
    {
        "code":  "140340",
        "name":  "Lease Liability",
        "opening":  -189386.85,
        "debit":  307109.63,
        "credit":  1224486.76,
        "closing":  -1106763.98
    },
    {
        "code":  "150100",
        "name":  "Software Development - Cost",
        "opening":  926762.27,
        "debit":  1393053.88,
        "credit":  0,
        "closing":  2319816.15
    },
    {
        "code":  "150110",
        "name":  "Software Development - Acc Depreciation",
        "opening":  -187103.29,
        "debit":  0,
        "credit":  459310.73,
        "closing":  -646414.02
    },
    {
        "code":  "150120",
        "name":  "Asset WIP - Cost",
        "opening":  1392558.1,
        "debit":  10371751.19,
        "credit":  10788132.86,
        "closing":  976176.43
    },
    {
        "code":  "210100",
        "name":  "Broker derivative liabilities",
        "opening":  -6967866.32,
        "debit":  10237760.51,
        "credit":  9196740.87,
        "closing":  -5926846.68
    },
    {
        "code":  "210200",
        "name":  "Client Derivative Liabilities",
        "opening":  -2482540.58,
        "debit":  3291131.01,
        "credit":  14526673.87,
        "closing":  -13718083.44
    },
    {
        "code":  "220100",
        "name":  "Creditors Control",
        "opening":  -0.01,
        "debit":  5308220.76,
        "credit":  5308220.76,
        "closing":  -0.01
    },
    {
        "code":  "220200",
        "name":  "AP Expense Accruals",
        "opening":  -452142.79,
        "debit":  7797761.77,
        "credit":  8231282.2,
        "closing":  -885663.22
    },
    {
        "code":  "240100-005",
        "name":  "IC-P AxiCorp Financial Services Pty Ltd USD",
        "opening":  -256868646.86,
        "debit":  1595185730.88,
        "credit":  1338317084.02,
        "closing":  0
    },
    {
        "code":  "240100-006",
        "name":  "IC-P AxiCorp Financial Services Pty Ltd (DIFC) USD",
        "opening":  -6725638.06,
        "debit":  53125493.13,
        "credit":  46399855.07,
        "closing":  0
    },
    {
        "code":  "240100-015",
        "name":  "IC-P AxiForex Limited (NZ) USD",
        "opening":  -0.1,
        "debit":  146243.2,
        "credit":  146243.1,
        "closing":  0
    },
    {
        "code":  "240100-020",
        "name":  "IC-P AxiCorp Limited",
        "opening":  -0.07,
        "debit":  114556254.31,
        "credit":  114556254.24,
        "closing":  0
    },
    {
        "code":  "240100-025",
        "name":  "IC-P AxiCorp Limited USD",
        "opening":  -0.05,
        "debit":  11576.81,
        "credit":  11576.76,
        "closing":  0
    },
    {
        "code":  "240100-035",
        "name":  "IC-P Topaxi Pty Ltd USD",
        "opening":  -0.1,
        "debit":  48914562.2,
        "credit":  48914562.1,
        "closing":  0
    },
    {
        "code":  "240100-045",
        "name":  "IC-P Axi Technologies India USD",
        "opening":  1778,
        "debit":  26884118,
        "credit":  26885896,
        "closing":  0
    },
    {
        "code":  "240100-075",
        "name":  "IC-P AxiFinancial Corporation Pty Ltd USD",
        "opening":  -0.01,
        "debit":  5090175.07,
        "credit":  5090175.06,
        "closing":  0
    },
    {
        "code":  "240100-135",
        "name":  "IC-P Axi Services (Cyprus) Limited USD",
        "opening":  -3647938,
        "debit":  38364922,
        "credit":  34716984,
        "closing":  0
    },
    {
        "code":  "240100-145",
        "name":  "IC-P ForexConvert Pty Ltd (aka AxiTechnology) USD",
        "opening":  -158943.14,
        "debit":  1508176.24,
        "credit":  1349233.1,
        "closing":  0
    },
    {
        "code":  "240100-160",
        "name":  "IC-P Axi Corp China",
        "opening":  0.01,
        "debit":  411099.22,
        "credit":  411099.23,
        "closing":  0
    },
    {
        "code":  "240100-165",
        "name":  "IC-P Axi Corp China USD",
        "opening":  -2681208.24,
        "debit":  21315528.49,
        "credit":  18634320.25,
        "closing":  0
    },
    {
        "code":  "240100-175",
        "name":  "IC-P Solaris EMEA Limited USD",
        "opening":  -6510597.37,
        "debit":  38229888.77,
        "credit":  31719291.4,
        "closing":  0
    },
    {
        "code":  "240100-180",
        "name":  "IC-P AxiTrade Limited (SVG)",
        "opening":  -43958139.57,
        "debit":  3609019115.77,
        "credit":  4268784224.75,
        "closing":  -703723248.55
    },
    {
        "code":  "240100-195",
        "name":  "IC-P Solaris Holdings International USD",
        "opening":  -148437.55,
        "debit":  6242256.16,
        "credit":  6093818.61,
        "closing":  0
    },
    {
        "code":  "240100-200",
        "name":  "IC-P Solaris Markets Ltd (Vanuatu)",
        "opening":  -318759.88,
        "debit":  3363101.67,
        "credit":  3044341.79,
        "closing":  0
    },
    {
        "code":  "240100-250",
        "name":  "IC-P PsyQuation Pty Ltd",
        "opening":  0.01,
        "debit":  473572.95,
        "credit":  473572.96,
        "closing":  0
    },
    {
        "code":  "240100-255",
        "name":  "IC-P PsyQuation Pty Ltd USD",
        "opening":  -31907.1,
        "debit":  462197.67,
        "credit":  430290.57,
        "closing":  0
    },
    {
        "code":  "240100-501",
        "name":  "IC-P Axi Financial Services (UK) Ltd",
        "opening":  -157422552.35,
        "debit":  1316364379.82,
        "credit":  1158941827.47,
        "closing":  0
    },
    {
        "code":  "240100-502",
        "name":  "IC-P CB Financial Services Rep Office (Dubai)",
        "opening":  -23426.51,
        "debit":  423143.06,
        "credit":  399716.55,
        "closing":  0
    },
    {
        "code":  "240100-504",
        "name":  "IC-P One Financial Consulting Services Limited (China)",
        "opening":  -0.23,
        "debit":  240163.91,
        "credit":  240163.68,
        "closing":  0
    },
    {
        "code":  "250100",
        "name":  "Trading Fees payable",
        "opening":  -932.14,
        "debit":  0,
        "credit":  0,
        "closing":  -932.14
    },
    {
        "code":  "250200",
        "name":  "Accrued Commissions",
        "opening":  -13133.59,
        "debit":  340669.14,
        "credit":  404367.39,
        "closing":  -76831.84
    },
    {
        "code":  "250300",
        "name":  "Salaries Control Account",
        "opening":  -320195.27,
        "debit":  466651.99,
        "credit":  463508.63,
        "closing":  -317051.91
    },
    {
        "code":  "250800",
        "name":  "PAYG Control",
        "opening":  7389.35,
        "debit":  23624.22,
        "credit":  26888.33,
        "closing":  4125.24
    },
    {
        "code":  "250900",
        "name":  "Make Good Provision",
        "opening":  -14841.03,
        "debit":  15555.2,
        "credit":  14597.72,
        "closing":  -13883.55
    },
    {
        "code":  "260100",
        "name":  "Provision for Income Tax",
        "opening":  -2257400.52,
        "debit":  2446606.73,
        "credit":  2492737.72,
        "closing":  -2303531.51
    },
    {
        "code":  "260200",
        "name":  "Tax Liabilities Current",
        "opening":  0,
        "debit":  7651.42,
        "credit":  7444.04,
        "closing":  207.38
    },
    {
        "code":  "260400",
        "name":  "Deferred Tax Liabilities Current",
        "opening":  -344378.8,
        "debit":  0,
        "credit":  0,
        "closing":  -344378.8
    },
    {
        "code":  "270100",
        "name":  "Provision for Bonus",
        "opening":  -908949.91,
        "debit":  17105157.59,
        "credit":  16848278.31,
        "closing":  -652070.63
    },
    {
        "code":  "270300",
        "name":  "Provision for Annual Leave",
        "opening":  -147087.27,
        "debit":  675117,
        "credit":  663038.18,
        "closing":  -135008.45
    },
    {
        "code":  "270600",
        "name":  "Provisions - Specific",
        "opening":  -55783.1,
        "debit":  575500.78,
        "credit":  586008.41,
        "closing":  -66290.73
    },
    {
        "code":  "300100",
        "name":  "Equity Shares",
        "opening":  -62237.75,
        "debit":  0,
        "credit":  0,
        "closing":  -62237.75
    },
    {
        "code":  "310600",
        "name":  "Retained Earnings",
        "opening":  -14729135.06,
        "debit":  0,
        "credit":  0,
        "closing":  -14729135.06
    },
    {
        "code":  "400100",
        "name":  "Client - Realised gains and losses",
        "opening":  0,
        "debit":  1988600240.21,
        "credit":  2284635801.28,
        "closing":  -296035561.07
    },
    {
        "code":  "400200",
        "name":  "Client - Unrealised gains and losses",
        "opening":  0,
        "debit":  73703611.68,
        "credit":  66127930.89,
        "closing":  7575680.79
    },
    {
        "code":  "400300",
        "name":  "Revaluation",
        "opening":  0,
        "debit":  791499895.13,
        "credit":  800036500.59,
        "closing":  -8536605.46
    },
    {
        "code":  "400500",
        "name":  "Broker - Realised gains and losses",
        "opening":  0,
        "debit":  166493795.51,
        "credit":  144577053.29,
        "closing":  21916742.22
    },
    {
        "code":  "400600",
        "name":  "Broker - Unrealised gains and losses",
        "opening":  0,
        "debit":  28480268.25,
        "credit":  27729792.69,
        "closing":  750475.56
    },
    {
        "code":  "410300",
        "name":  "Currency conversion",
        "opening":  0,
        "debit":  1227227473.59,
        "credit":  1227989622.12,
        "closing":  -762148.53
    },
    {
        "code":  "430400",
        "name":  "Transfer Pricing - Revenue",
        "opening":  0,
        "debit":  1291230647,
        "credit":  1067917272,
        "closing":  223313375
    },
    {
        "code":  "440100",
        "name":  "Other Income",
        "opening":  0,
        "debit":  1429407.82,
        "credit":  1748645.22,
        "closing":  -319237.4
    },
    {
        "code":  "510100",
        "name":  "Commissions",
        "opening":  0,
        "debit":  569444.27,
        "credit":  316776.56,
        "closing":  252667.71
    },
    {
        "code":  "530300",
        "name":  "Transfer Pricing - Direct costs",
        "opening":  0,
        "debit":  140381098,
        "credit":  117954558,
        "closing":  22426540
    },
    {
        "code":  "550100",
        "name":  "Bad debts",
        "opening":  0,
        "debit":  5.75,
        "credit":  143.04,
        "closing":  -137.29
    },
    {
        "code":  "600100",
        "name":  "Salaries",
        "opening":  0,
        "debit":  5200256.85,
        "credit":  517639.36,
        "closing":  4682617.49
    },
    {
        "code":  "600110",
        "name":  "Termination",
        "opening":  0,
        "debit":  43870.22,
        "credit":  0,
        "closing":  43870.22
    },
    {
        "code":  "600130",
        "name":  "Redundancy",
        "opening":  0,
        "debit":  5.03,
        "credit":  0,
        "closing":  5.03
    },
    {
        "code":  "600140",
        "name":  "Allowances",
        "opening":  0,
        "debit":  72214.43,
        "credit":  7015.92,
        "closing":  65198.51
    },
    {
        "code":  "600150",
        "name":  "Salary - Overtime",
        "opening":  0,
        "debit":  302.62,
        "credit":  0,
        "closing":  302.62
    },
    {
        "code":  "600160",
        "name":  "Contractors",
        "opening":  0,
        "debit":  8792845.05,
        "credit":  5850841.12,
        "closing":  2942003.93
    },
    {
        "code":  "600180",
        "name":  "Superannuation",
        "opening":  0,
        "debit":  424636.45,
        "credit":  31923.2,
        "closing":  392713.25
    },
    {
        "code":  "600190",
        "name":  "National Insurance",
        "opening":  0,
        "debit":  4491.06,
        "credit":  345.11,
        "closing":  4145.95
    },
    {
        "code":  "600200",
        "name":  "Payroll Tax",
        "opening":  0,
        "debit":  63.03,
        "credit":  0,
        "closing":  63.03
    },
    {
        "code":  "600205",
        "name":  "Insurance Personnel",
        "opening":  0,
        "debit":  13.31,
        "credit":  0,
        "closing":  13.31
    },
    {
        "code":  "600210",
        "name":  "Annual Leave",
        "opening":  0,
        "debit":  425392.16,
        "credit":  434143.71,
        "closing":  -8751.55
    },
    {
        "code":  "600305",
        "name":  "Bonus - Other",
        "opening":  0,
        "debit":  216928.85,
        "credit":  0,
        "closing":  216928.85
    },
    {
        "code":  "600310",
        "name":  "Bonus - Annual",
        "opening":  0,
        "debit":  20416521.52,
        "credit":  18559799.2,
        "closing":  1856722.32
    },
    {
        "code":  "600500",
        "name":  "Recruitment Fees",
        "opening":  0,
        "debit":  150454.7,
        "credit":  91744.15,
        "closing":  58710.55
    },
    {
        "code":  "600520",
        "name":  "Payroll Services",
        "opening":  0,
        "debit":  1447272.51,
        "credit":  987294.37,
        "closing":  459978.14
    },
    {
        "code":  "600530",
        "name":  "Staff Training \u0026 Seminars",
        "opening":  0,
        "debit":  29282.87,
        "credit":  0,
        "closing":  29282.87
    },
    {
        "code":  "600535",
        "name":  "Professional Subscriptions - Personnel",
        "opening":  0,
        "debit":  360.17,
        "credit":  117.72,
        "closing":  242.45
    },
    {
        "code":  "600545",
        "name":  "Relocation Expenses",
        "opening":  0,
        "debit":  24149.79,
        "credit":  0,
        "closing":  24149.79
    },
    {
        "code":  "600550",
        "name":  "Staff Medical",
        "opening":  0,
        "debit":  2864.88,
        "credit":  1291.08,
        "closing":  1573.8
    },
    {
        "code":  "600555",
        "name":  "Staff Benefits",
        "opening":  0,
        "debit":  1761.82,
        "credit":  0,
        "closing":  1761.82
    },
    {
        "code":  "600565",
        "name":  "Personnel costs capitalised",
        "opening":  0,
        "debit":  9798175.9,
        "credit":  10774848.11,
        "closing":  -976672.21
    },
    {
        "code":  "600570",
        "name":  "Staff Entertainment",
        "opening":  0,
        "debit":  66264.99,
        "credit":  384.75,
        "closing":  65880.24
    },
    {
        "code":  "610150",
        "name":  "Transport - Air, Rail, Bus, ferry and Train",
        "opening":  0,
        "debit":  226235.16,
        "credit":  1376,
        "closing":  224859.16
    },
    {
        "code":  "610160",
        "name":  "Accommodation",
        "opening":  0,
        "debit":  212315.04,
        "credit":  879.87,
        "closing":  211435.17
    },
    {
        "code":  "610170",
        "name":  "Staff Meals and Sustenance",
        "opening":  0,
        "debit":  42676.61,
        "credit":  0,
        "closing":  42676.61
    },
    {
        "code":  "610180",
        "name":  "Client Entertainment",
        "opening":  0,
        "debit":  18665.57,
        "credit":  75.42,
        "closing":  18590.15
    },
    {
        "code":  "610190",
        "name":  "Taxis and Rideshares",
        "opening":  0,
        "debit":  9000.6,
        "credit":  339.18,
        "closing":  8661.42
    },
    {
        "code":  "620120",
        "name":  "Marketing - Tools",
        "opening":  0,
        "debit":  209.28,
        "credit":  85.14,
        "closing":  124.14
    },
    {
        "code":  "620150",
        "name":  "Marketing - IB",
        "opening":  0,
        "debit":  1291.96,
        "credit":  0,
        "closing":  1291.96
    },
    {
        "code":  "620160",
        "name":  "Marketing - Brand",
        "opening":  0,
        "debit":  89552.68,
        "credit":  401.7,
        "closing":  89150.98
    },
    {
        "code":  "620180",
        "name":  "Marketing- Tradeshows, Exhibitions \u0026 Events",
        "opening":  0,
        "debit":  9057.79,
        "credit":  0,
        "closing":  9057.79
    },
    {
        "code":  "620500",
        "name":  "Sales - Campaigns",
        "opening":  0,
        "debit":  1129.64,
        "credit":  0,
        "closing":  1129.64
    },
    {
        "code":  "620520",
        "name":  "Sales - Gifts \u0026 Donations",
        "opening":  0,
        "debit":  19527.69,
        "credit":  0,
        "closing":  19527.69
    },
    {
        "code":  "630100",
        "name":  "Telephony",
        "opening":  0,
        "debit":  2943.46,
        "credit":  1050.02,
        "closing":  1893.44
    },
    {
        "code":  "630110",
        "name":  "Internet comms",
        "opening":  0,
        "debit":  3774.17,
        "credit":  0,
        "closing":  3774.17
    },
    {
        "code":  "630120",
        "name":  "Technology licences and domains",
        "opening":  0,
        "debit":  11407.88,
        "credit":  663.99,
        "closing":  10743.89
    },
    {
        "code":  "630150",
        "name":  "Technology Outsourced Services",
        "opening":  0,
        "debit":  99405.37,
        "credit":  46688,
        "closing":  52717.37
    },
    {
        "code":  "630160",
        "name":  "Technology Minor Hardware",
        "opening":  0,
        "debit":  2507.91,
        "credit":  0,
        "closing":  2507.91
    },
    {
        "code":  "630170",
        "name":  "Technology Software as a Service",
        "opening":  0,
        "debit":  23582.59,
        "credit":  0,
        "closing":  23582.59
    },
    {
        "code":  "630180",
        "name":  "AI Subscription \u0026 Usage",
        "opening":  0,
        "debit":  5121.8,
        "credit":  0,
        "closing":  5121.8
    },
    {
        "code":  "640100",
        "name":  "Rent",
        "opening":  0,
        "debit":  1511823.91,
        "credit":  1112695.9,
        "closing":  399128.01
    },
    {
        "code":  "640105",
        "name":  "Premises Maintenance",
        "opening":  0,
        "debit":  78542.03,
        "credit":  20436.83,
        "closing":  58105.2
    },
    {
        "code":  "640110",
        "name":  "Cleaning \u0026 Utilities (Heat, Light and Water)",
        "opening":  0,
        "debit":  21553.04,
        "credit":  0,
        "closing":  21553.04
    },
    {
        "code":  "640130",
        "name":  "Stationery, Printing \u0026 Postage",
        "opening":  0,
        "debit":  28672.54,
        "credit":  12992.53,
        "closing":  15680.01
    },
    {
        "code":  "640140",
        "name":  "Kitchen \u0026 Canteen Costs",
        "opening":  0,
        "debit":  548.89,
        "credit":  0,
        "closing":  548.89
    },
    {
        "code":  "650100",
        "name":  "Accounting \u0026 Auditing Services",
        "opening":  0,
        "debit":  660586.98,
        "credit":  575500.76,
        "closing":  85086.22
    },
    {
        "code":  "650110",
        "name":  "Compliance \u0026 Regulatory Services",
        "opening":  0,
        "debit":  296977.73,
        "credit":  70020.56,
        "closing":  226957.17
    },
    {
        "code":  "650120",
        "name":  "Legal Services",
        "opening":  0,
        "debit":  8222.07,
        "credit":  0,
        "closing":  8222.07
    },
    {
        "code":  "650150",
        "name":  "Consultancy",
        "opening":  0,
        "debit":  85848.75,
        "credit":  19200,
        "closing":  66648.75
    },
    {
        "code":  "660100",
        "name":  "Corp Subscriptions \u0026 Membership Fee",
        "opening":  0,
        "debit":  70688.26,
        "credit":  0,
        "closing":  70688.26
    },
    {
        "code":  "660110",
        "name":  "Statutory \u0026 Regulatory Fees",
        "opening":  0,
        "debit":  119291.11,
        "credit":  119291.18,
        "closing":  -0.07
    },
    {
        "code":  "660130",
        "name":  "Bank fees - Corporate funds",
        "opening":  0,
        "debit":  6976.92,
        "credit":  401.47,
        "closing":  6575.45
    },
    {
        "code":  "660140",
        "name":  "Charitable donations",
        "opening":  0,
        "debit":  572.08,
        "credit":  0,
        "closing":  572.08
    },
    {
        "code":  "670100",
        "name":  "Amortisation Development costs",
        "opening":  0,
        "debit":  459310.73,
        "credit":  0,
        "closing":  459310.73
    },
    {
        "code":  "670120",
        "name":  "Depreciation Computer",
        "opening":  0,
        "debit":  78098.75,
        "credit":  0,
        "closing":  78098.75
    },
    {
        "code":  "670150",
        "name":  "Depreciation ROU Assets",
        "opening":  0,
        "debit":  340329.23,
        "credit":  0,
        "closing":  340329.23
    },
    {
        "code":  "670160",
        "name":  "Disposal/Impairment of Assets",
        "opening":  0,
        "debit":  13810.05,
        "credit":  13809.74,
        "closing":  0.31
    },
    {
        "code":  "680120",
        "name":  "Lease Interest Expense",
        "opening":  0,
        "debit":  23059.74,
        "credit":  0,
        "closing":  23059.74
    },
    {
        "code":  "680200",
        "name":  "Insurance Corporate",
        "opening":  0,
        "debit":  200205.35,
        "credit":  18472.21,
        "closing":  181733.14
    },
    {
        "code":  "690200",
        "name":  "Transfer Pricing - Expenses",
        "opening":  0,
        "debit":  111709716,
        "credit":  93147168,
        "closing":  18562548
    },
    {
        "code":  "700100",
        "name":  "Income Tax Expense",
        "opening":  0,
        "debit":  2467726.72,
        "credit":  2422273.63,
        "closing":  45453.09
    },
    {
        "code":  "999999",
        "name":  "GL Suspense Account",
        "opening":  0.02,
        "debit":  0,
        "credit":  0.02,
        "closing":  0
    }
];
if (typeof module !== 'undefined' && module.exports) module.exports = { AUS155_TB };

