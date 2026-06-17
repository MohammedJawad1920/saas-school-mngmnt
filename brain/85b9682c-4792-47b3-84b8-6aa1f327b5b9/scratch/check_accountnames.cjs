const mongoose = require('mongoose');
(async () => {
    const uri = 'mongodb+srv://abdullakk:abdullakk3030@sdc.qw7au9k.mongodb.net/scofist?retryWrites=true&w=majority&appName=SDC';
    try {
        await mongoose.connect(uri);
        const AccountName = mongoose.models.AccountName || mongoose.model('AccountName', new mongoose.Schema({ 
            name: String, 
            accountType: String, 
            userId: String 
        }, { collection: 'accountnames' })); // Check collection name
        
        const all = await AccountName.find({}).limit(50);
        console.log('All AccountNames:', JSON.stringify(all));

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
})();
