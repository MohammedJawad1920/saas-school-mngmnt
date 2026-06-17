const mongoose = require('mongoose');
(async () => {
    const uri = 'mongodb+srv://abdullakk:abdullakk3030@sdc.qw7au9k.mongodb.net/scofist?retryWrites=true&w=majority&appName=SDC';
    try {
        await mongoose.connect(uri);
        const Finance = mongoose.models.Finance || mongoose.model('Finance', new mongoose.Schema({ 
            accountName: String, 
            accountType: String, 
            userId: String 
        }, { collection: 'finances' }));
        
        const withUserId = await Finance.find({ userId: { $exists: true, $ne: null } }).limit(20);
        console.log('Records with userId:', JSON.stringify(withUserId));

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
})();
