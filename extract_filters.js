const fs = require('fs');

const data = JSON.parse(fs.readFileSync('web/public/products.json', 'utf8'));

const uniqueValues = {
  face_value: new Set(),
  issue_year: new Set(),
  diameter: new Set(),
  weight: new Set(),
  metal: new Set(),
  mint_or_theme: new Set(),
  era: new Set()
};

data.forEach(product => {
  uniqueValues.face_value.add(product.face_value);
  uniqueValues.issue_year.add(product.issue_year);
  uniqueValues.diameter.add(product.diameter);
  uniqueValues.weight.add(product.weight);
  uniqueValues.metal.add(product.metal);
  uniqueValues.mint_or_theme.add(product.mint_or_theme);
  uniqueValues.era.add(product.era);
});

const result = {};
for (const key in uniqueValues) {
  result[key] = Array.from(uniqueValues[key]).sort();
}

console.log(JSON.stringify(result, null, 2));