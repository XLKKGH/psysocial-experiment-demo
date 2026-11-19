const db = window.supabase.createClient(
    'https://hwlpkbckvggksregqqte.supabase.co',
    'sb_publishable_X-ICA1ppX6u4YFiI0-Br8g_O8Qm8t7t'
);

let uploadQueue = Promise.resolve();

function syncDatabase(snapshot) {
    const status = document.getElementById('sync-status');
    status.textContent = 'Saving responses...';

    uploadQueue = uploadQueue.then(async () => {
        let { data, error } = await db.auth.getSession();

        if (error) throw error;

        if (!data.session) {
            const result = await db.auth.signInAnonymously();
            if (result.error) throw result.error;
            data = result.data;
        }

        const result = await db.from('participants').upsert({
            participant_id: snapshot.id,
            owner_id: data.session.user.id,
            version: snapshot.version,
            responses: snapshot,
            completed: Boolean(snapshot.completed),
            updated_at: new Date().toISOString()
        });

        if (result.error) throw result.error;

        status.textContent = 'Responses saved';
    }).catch(error => {
        console.error('Database error:', error);
        status.textContent =
            'Upload failed. Refresh this page to retry.';
    });
}