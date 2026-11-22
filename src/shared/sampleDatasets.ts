import { DatasetColumnMeta } from './types';

export interface BuiltinSampleDataset {
  id: string;
  name: string;
  description: string;
  targetColumn: string;
  rows: Record<string, any>[];
}

function seededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function buildAdultCensus(): Record<string, any>[] {
  const rand = seededRandom(101);
  const workclasses = ['Private', 'Self-emp-not-inc', 'Local-gov', 'State-gov', 'Federal-gov'];
  const educations = ['Bachelors', 'HS-grad', 'Masters', 'Some-college', 'Doctorate'];
  const eduNumMap: Record<string, number> = {
    'HS-grad': 9,
    'Some-college': 10,
    Bachelors: 13,
    Masters: 14,
    Doctorate: 16,
  };
  const occupations = ['Tech-support', 'Exec-managerial', 'Prof-specialty', 'Sales', 'Craft-repair', 'Adm-clerical'];
  const rows: Record<string, any>[] = [];
  for (let i = 0; i < 160; i++) {
    const edu = educations[Math.floor(rand() * educations.length)];
    const eduNum = eduNumMap[edu];
    const age = Math.round(21 + rand() * 44);
    const hours = Math.round(25 + rand() * 35);
    const capGain = rand() > 0.78 ? Math.round(2000 + rand() * 12000) : 0;
    const occ = occupations[Math.floor(rand() * occupations.length)];
    const work = workclasses[Math.floor(rand() * workclasses.length)];
    const score =
      (age - 35) * 0.045 +
      (eduNum - 11) * 0.42 +
      (hours - 40) * 0.055 +
      (capGain > 0 ? 1.8 : -0.3) +
      (occ === 'Exec-managerial' || occ === 'Prof-specialty' ? 0.65 : -0.25) +
      (rand() - 0.5) * 0.9;
    const income = score > 0.35 ? '>50K' : '<=50K';
    rows.push({
      age: i % 19 === 0 ? null : age,
      workclass: i % 23 === 0 ? null : work,
      education: edu,
      'education-num': eduNum,
      occupation: occ,
      'capital-gain': capGain,
      'hours-per-week': hours,
      income,
    });
  }
  return rows;
}

function buildIris(): Record<string, any>[] {
  const rand = seededRandom(202);
  const specs = [
    { species: 'Iris-setosa', sl: 5.0, sw: 3.4, pl: 1.5, pw: 0.25 },
    { species: 'Iris-versicolor', sl: 5.9, sw: 2.8, pl: 4.3, pw: 1.3 },
    { species: 'Iris-virginica', sl: 6.6, sw: 3.0, pl: 5.5, pw: 2.0 },
  ];
  const rows: Record<string, any>[] = [];
  for (let i = 0; i < 150; i++) {
    const sp = specs[i % 3];
    rows.push({
      sepal_length: +(sp.sl + (rand() - 0.5) * 0.8).toFixed(2),
      sepal_width: +(sp.sw + (rand() - 0.5) * 0.6).toFixed(2),
      petal_length: +(sp.pl + (rand() - 0.5) * 0.7).toFixed(2),
      petal_width: +(sp.pw + (rand() - 0.5) * 0.4).toFixed(2),
      species: sp.species,
    });
  }
  return rows;
}

function buildTitanic(): Record<string, any>[] {
  const rand = seededRandom(303);
  const rows: Record<string, any>[] = [];
  for (let i = 0; i < 150; i++) {
    const pclass = rand() < 0.28 ? 1 : rand() < 0.58 ? 2 : 3;
    const sex = rand() < 0.42 ? 'female' : 'male';
    const age = i % 11 === 0 ? null : Math.round(4 + rand() * 58);
    const sibsp = rand() < 0.65 ? 0 : rand() < 0.9 ? 1 : 2;
    const fare = +(pclass === 1 ? 55 + rand() * 90 : pclass === 2 ? 18 + rand() * 25 : 7 + rand() * 14).toFixed(2);
    const logit =
      (sex === 'female' ? 1.65 : -1.1) +
      (pclass === 1 ? 0.95 : pclass === 2 ? 0.2 : -0.75) +
      ((age ?? 28) < 15 ? 0.8 : -0.01 * (age ?? 28)) +
      (rand() - 0.5) * 0.7;
    rows.push({
      pclass,
      sex,
      age,
      sibsp,
      fare,
      survived: logit > 0.1 ? '1' : '0',
    });
  }
  return rows;
}

function buildHousing(): Record<string, any>[] {
  const rand = seededRandom(404);
  const rows: Record<string, any>[] = [];
  for (let i = 0; i < 150; i++) {
    const medianIncome = +(1.8 + rand() * 8.5).toFixed(2);
    const houseAge = Math.round(5 + rand() * 45);
    const avgRooms = +(3.5 + rand() * 4.5).toFixed(2);
    const population = Math.round(400 + rand() * 2600);
    const oceanProx = rand() < 0.35 ? 'NEAR BAY' : rand() < 0.7 ? 'INLAND' : '<1H OCEAN';
    const price = +(
      52000 +
      medianIncome * 41000 +
      avgRooms * 9500 -
      houseAge * 380 +
      (oceanProx === 'NEAR BAY' ? 42000 : oceanProx === '<1H OCEAN' ? 24000 : -15000) +
      (rand() - 0.5) * 28000
    ).toFixed(0);
    rows.push({
      median_income: medianIncome,
      housing_median_age: houseAge,
      avg_rooms: avgRooms,
      population,
      ocean_proximity: oceanProx,
      median_house_value: Math.max(45000, price),
    });
  }
  return rows;
}

function buildChurn(): Record<string, any>[] {
  const rand = seededRandom(505);
  const contracts = ['Month-to-month', 'One year', 'Two year'];
  const rows: Record<string, any>[] = [];
  for (let i = 0; i < 140; i++) {
    const tenure = Math.round(1 + rand() * 70);
    const contract = contracts[Math.floor(rand() * contracts.length)];
    const monthlyCharges = +(22 + rand() * 88).toFixed(2);
    const supportCalls = Math.floor(rand() * 6);
    const logit =
      (contract === 'Month-to-month' ? 1.15 : contract === 'One year' ? -0.4 : -1.2) -
      tenure * 0.035 +
      monthlyCharges * 0.018 +
      supportCalls * 0.35 +
      (rand() - 0.5) * 0.8;
    rows.push({
      tenure_months: tenure,
      contract_type: contract,
      monthly_charges: monthlyCharges,
      support_calls: supportCalls,
      churn: logit > 0.2 ? 'Yes' : 'No',
    });
  }
  return rows;
}

function buildCustomers(): Record<string, any>[] {
  const rand = seededRandom(606);
  const centers = [
    { inc: 25, spend: 20, age: 45 },
    { inc: 28, spend: 80, age: 24 },
    { inc: 58, spend: 50, age: 36 },
    { inc: 88, spend: 18, age: 42 },
    { inc: 90, spend: 84, age: 31 },
  ];
  const rows: Record<string, any>[] = [];
  for (let i = 0; i < 120; i++) {
    const c = centers[i % centers.length];
    rows.push({
      age: Math.round(c.age + (rand() - 0.5) * 10),
      annual_income_k: +(c.inc + (rand() - 0.5) * 14).toFixed(1),
      spending_score: +(c.spend + (rand() - 0.5) * 14).toFixed(1),
    });
  }
  return rows;
}

function buildFraud(): Record<string, any>[] {
  const rand = seededRandom(707);
  const rows: Record<string, any>[] = [];
  for (let i = 0; i < 140; i++) {
    const isAnomaly = i % 14 === 0;
    rows.push({
      amount_usd: isAnomaly ? +(1200 + rand() * 3500).toFixed(2) : +(12 + rand() * 240).toFixed(2),
      tx_velocity_1h: isAnomaly ? Math.round(8 + rand() * 14) : Math.round(1 + rand() * 3),
      device_risk_score: isAnomaly ? +(0.72 + rand() * 0.27).toFixed(3) : +(0.02 + rand() * 0.25).toFixed(3),
      distance_km: isAnomaly ? +(450 + rand() * 2500).toFixed(1) : +(0.5 + rand() * 35).toFixed(1),
      is_fraud: isAnomaly ? '1' : '0',
    });
  }
  return rows;
}

export const BUILTIN_SAMPLE_DATASETS: BuiltinSampleDataset[] = [
  {
    id: 'sample-adult-census',
    name: 'Adult Census Income',
    description: 'UCI Adult Census binary classification dataset predicting whether annual income exceeds $50K.',
    targetColumn: 'income',
    rows: buildAdultCensus(),
  },
  {
    id: 'sample-iris',
    name: 'Iris Two-Class / Multiclass',
    description: 'Classic 3-species flower classification benchmark with sepal and petal measurements.',
    targetColumn: 'species',
    rows: buildIris(),
  },
  {
    id: 'sample-titanic',
    name: 'Titanic Survival Data',
    description: 'Passenger manifest with missing Age entries and binary survival target.',
    targetColumn: 'survived',
    rows: buildTitanic(),
  },
  {
    id: 'sample-housing',
    name: 'California Housing Prices',
    description: 'Continuous median house value regression dataset.',
    targetColumn: 'median_house_value',
    rows: buildHousing(),
  },
  {
    id: 'sample-churn',
    name: 'Telco Customer Churn',
    description: 'Subscription customer retention and churn prediction dataset.',
    targetColumn: 'churn',
    rows: buildChurn(),
  },
  {
    id: 'sample-customers',
    name: 'Mall Customer Segments',
    description: 'Unsupervised clustering benchmark with income, age, and spending score.',
    targetColumn: 'spending_score',
    rows: buildCustomers(),
  },
  {
    id: 'sample-fraud',
    name: 'Credit Anomaly Transactions',
    description: 'Transaction anomaly dataset with velocity, distance, and device risk score.',
    targetColumn: 'is_fraud',
    rows: buildFraud(),
  },
];

export const SAMPLE_DATASET_MAP: Record<string, BuiltinSampleDataset> = Object.fromEntries(
  BUILTIN_SAMPLE_DATASETS.map((d) => [d.id, d])
);

export function inferDatasetColumns(rows: Record<string, any>[]): DatasetColumnMeta[] {
  if (!rows.length) return [];
  const colNames = Object.keys(rows[0]);
  return colNames.map((name) => {
    let missingCount = 0;
    const values: any[] = [];
    const numericVals: number[] = [];
    for (const r of rows) {
      const v = r[name];
      if (v === null || v === undefined || v === '' || Number.isNaN(v)) {
        missingCount++;
      } else {
        values.push(v);
        const num = typeof v === 'number' ? v : Number(v);
        if (!Number.isNaN(num) && String(v).trim() !== '') {
          numericVals.push(num);
        }
      }
    }
    const isNumeric = values.length > 0 && numericVals.length === values.length;
    const uniqueCount = new Set(values.map((v) => String(v))).size;
    if (isNumeric) {
      const min = Math.min(...numericVals);
      const max = Math.max(...numericVals);
      const mean = +(numericVals.reduce((a, b) => a + b, 0) / numericVals.length).toFixed(4);
      return { name, type: 'numeric', missingCount, uniqueCount, min, max, mean };
    }
    return { name, type: 'categorical', missingCount, uniqueCount };
  });
}
