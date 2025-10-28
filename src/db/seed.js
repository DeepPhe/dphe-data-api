/**
 * Sample script to seed SQLite with example data
 * Run with: node src/db/seed.js
 */

const { SQLiteClient } = require('./sqlite-client');
const { DB_PATH } = require('../config/database');

async function seedDatabase() {
  const db = new SQLiteClient(DB_PATH);

  try {
    console.log('Opening database...');
    await db.open();

    console.log('Seeding sample data...');

    // Sample patient demographics
    const samplePatients = [
      {
        id: 'PAT001',
        demographics: {
          patientId: 'PAT001',
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: '1980-05-15',
          gender: 'Male',
          ethnicity: 'Caucasian',
          address: {
            street: '123 Main St',
            city: 'Denver',
            state: 'CO',
            zipCode: '80201'
          }
        }
      },
      {
        id: 'PAT002',
        demographics: {
          patientId: 'PAT002',
          firstName: 'Jane',
          lastName: 'Smith',
          dateOfBirth: '1975-08-22',
          gender: 'Female',
          ethnicity: 'Hispanic',
          address: {
            street: '456 Oak Ave',
            city: 'Boulder',
            state: 'CO',
            zipCode: '80302'
          }
        }
      },
      {
        id: 'PAT003',
        demographics: {
          patientId: 'PAT003',
          firstName: 'Robert',
          lastName: 'Johnson',
          dateOfBirth: '1990-12-03',
          gender: 'Male',
          ethnicity: 'African American',
          address: {
            street: '789 Pine Rd',
            city: 'Colorado Springs',
            state: 'CO',
            zipCode: '80903'
          }
        }
      }
    ];

    // Store demographics
    for (const patient of samplePatients) {
      const key = `patient:${patient.id}:demographics`;
      await db.put(key, patient.demographics);
      console.log(`✓ Added demographics for ${patient.id}`);
    }

    // Sample cancer data
    const sampleCancers = [
      {
        patientId: 'PAT001',
        cancerId: 'CAN001',
        type: 'Breast Cancer',
        stage: 'II',
        diagnosisDate: '2023-03-15'
      },
      {
        patientId: 'PAT002',
        cancerId: 'CAN002',
        type: 'Lung Cancer',
        stage: 'IIIA',
        diagnosisDate: '2022-11-20'
      }
    ];

    for (const cancer of sampleCancers) {
      const key = `patient:${cancer.patientId}:cancer:${cancer.cancerId}`;
      await db.put(key, cancer);
      console.log(`✓ Added cancer data ${cancer.cancerId} for ${cancer.patientId}`);
    }

    // Sample documents
    const sampleDocuments = [
      {
        patientId: 'PAT001',
        documentId: 'DOC001',
        title: 'Pathology Report',
        date: '2023-03-20',
        type: 'pathology'
      },
      {
        patientId: 'PAT001',
        documentId: 'DOC002',
        title: 'Clinical Notes',
        date: '2023-04-05',
        type: 'clinical'
      }
    ];

    for (const doc of sampleDocuments) {
      const key = `patient:${doc.patientId}:document:${doc.documentId}`;
      await db.put(key, doc);
      console.log(`✓ Added document ${doc.documentId} for ${doc.patientId}`);
    }

    console.log('\n✅ Database seeded successfully!');
    console.log('\nYou can now test the API with these patient IDs:');
    samplePatients.forEach(p => {
      console.log(`  - ${p.id}`);
    });

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await db.close();
    console.log('\nDatabase connection closed');
  }
}

// Run the seeder
if (require.main === module) {
  seedDatabase().catch(console.error);
}

module.exports = seedDatabase;

