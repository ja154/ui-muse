const test = async () => {
    try {
        const res = await fetch('http://localhost:3000/api/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: 'https://example.com' })
        });
        const data = await res.json();
        console.log("Status:", res.status);
        if (data.error) {
            console.error("Error:", data.error);
        } else {
            console.log("Title:", data.title);
            console.log("HTML length:", data.html?.length);
            console.log("Screenshot length:", data.screenshot?.length);
        }
    } catch (e) {
        console.error("Fetch failed:", e);
    }
};
test();
