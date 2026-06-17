import { MongoClient } from 'mongodb';

async function updateContactNumbers() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI missing");
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();
    const usersCollection = db.collection('users'); // Usually lowercase plural of User
    
    const users = await usersCollection.find({}).toArray();
    let count = 0;
    
    for (let u of users) {
      let updated = false;
      let updates = {};
      
      if (u.contactNumber && /^\d{10}$/.test(u.contactNumber)) { 
        updates.contactNumber = '+91 ' + u.contactNumber; 
        updated = true; 
      }
      
      if (u.alternativeNumber && /^\d{10}$/.test(u.alternativeNumber)) { 
        updates.alternativeNumber = '+91 ' + u.alternativeNumber; 
        updated = true; 
      }
      
      if (u.studentSpecificField) {
        if (u.studentSpecificField.guardianContactNumber && /^\d{10}$/.test(u.studentSpecificField.guardianContactNumber)) { 
          updates['studentSpecificField.guardianContactNumber'] = '+91 ' + u.studentSpecificField.guardianContactNumber; 
          updated = true; 
        }
        
        if (u.studentSpecificField.guardianAlternativeNumber && /^\d{10}$/.test(u.studentSpecificField.guardianAlternativeNumber)) { 
          updates['studentSpecificField.guardianAlternativeNumber'] = '+91 ' + u.studentSpecificField.guardianAlternativeNumber; 
          updated = true; 
        }
      }
      
      if (updated) {
        await usersCollection.updateOne({ _id: u._id }, { $set: updates });
        count++;
      }
    }
    
    console.log(`Updated ${count} user records with +91 country code.`);
  } finally {
    await client.close();
  }
}

updateContactNumbers().catch(err => {
  console.error(err);
  process.exit(1);
});
