import { applyDistinct } from './utils/transformations';

const data = [];
for (let i = 0; i < 10000; i++) {
  data.push({
    id: i,
    name: 'Name ' + (i % 100),
    value: i % 50,
    category: 'Category ' + (i % 10)
  });
}

console.time('applyDistinct');
const result = applyDistinct(data);
console.timeEnd('applyDistinct');
console.log('Result size:', result.length);
