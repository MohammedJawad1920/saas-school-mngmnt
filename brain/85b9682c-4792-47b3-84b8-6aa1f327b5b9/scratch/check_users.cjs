const mongoose = require('mongoose');
(async () => {
    const uri = 'mongodb+srv://abdullakk:abdullakk3030@sdc.qw7au9k.mongodb.net/scofist?retryWrites=true&w=majority&appName=SDC';
    try {
        await mongoose.connect(uri);
        const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({ 
            _id: String,
            username: String, 
            roles: [String] 
        }, { collection: 'users' }));
        
        const users = await User.find({ _id: /tch/i });
        console.log('Users:', JSON.stringify(users));

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
})();
