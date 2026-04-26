const fs = require('fs');
const path = 'prisma/schema.prisma';
let content = fs.readFileSync(path, 'utf8');

// 1. Fix ONLY nullable IDs globally
content = content.replace(/String\?\s+@id/g, 'String @id');

// 2. ONLY remove @@ignore for models that now have a valid @id
// We search for a pattern: model Name { ... id String @id ... @@ignore }
const models = content.split('model ');
const header = models.shift();

const fixedModels = models.map(model => {
  if (model.includes('@id') && !model.includes('? @id')) {
     return model.replace(/\n\s+@@ignore/g, '');
  }
  return model;
});

content = header + fixedModels.map(m => 'model ' + m).join('');

fs.writeFileSync(path, content);
console.log('Schema fixed safely.');
