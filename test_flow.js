const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const code = fs.readFileSync('js/app.js', 'utf8');
const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`, { runScripts: "dangerously" });
const window = dom.window;
global.window = window;

try {
    eval(code);    // Loads DataAPI
    // Simulate flow
    const db = window.getDB();
    const mockUser = { id: '927623bec001', role: 'student', d_id: 'ECE' };
    const compId = 'TKT-TEST123';
    
    // Create
    const newComp = {
        id: compId,
        sys_id: 'PC-ECE-L1-01',
        reporter_id: mockUser.id,
        status: 'Pending Admin', 
        date: new Date().toISOString()
    };
    db.complaints.push(newComp);
    window.saveDB(db);

    // Forward
    window.DataAPI.forwardToIncharge(compId);
    
    const dbAfter = window.getDB();
    const forwarded = dbAfter.complaints.find(c => c.id === compId);
    console.log("Status after forward:", forwarded.status);

    // Try Filter logic exactly as in staff.html
    const myLabId = 'ALL';
    const user = { d_id: 'ECE', id: 'STAFF-ECE' };
    let comps = dbAfter.complaints.filter(c => {
        const status = String(c.status).trim();
        if (status === 'Pending Approval') return true;
        const sys = dbAfter.systems.find(s=>s.id === c.sys_id);
        if (!sys) return false;
        if (myLabId === 'ALL') {
            return dbAfter.labs.some(l => l.d_id === user.d_id && l.id === sys.lab_id);
        }
        return sys.lab_id === myLabId;
    });

    comps = comps.filter(c => {
        const status = String(c.status).trim();
        if (status === 'Pending Approval') return true;
        return true;
    });

    console.log("Is comp in Staff Triage view?", comps.some(c => c.id === compId));

    // Try formatSysName
    let displayId = forwarded.sys_id;
    displayId = displayId.replace('ECE-L1', 'NL');
    console.log("Format Sys:", displayId);

} catch(e) {
    console.error("Error evaluating:", e);
}
