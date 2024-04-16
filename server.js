import fetch from 'node-fetch'
import cron from 'node-cron'
import pg from 'pg'

const pool = new pg.Pool({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'test',
    database: 'testbot'
})


async function fetchPsql(query, ...arr) {
    try {
        const client = await pool.connect()
        const result = await client.query(query, arr)
        client.release()
        return result.rows
    } catch (error) {
        console.log(error, 'fetchPsql');
    }
}


async function runner() {
    cron.schedule('*/3 * * * * *', async () => {
        const getLastUpdate = await fetchPsql('select * from lastUpdate').then(data => +data[0].update_id+1)

        const request = await fetch('http://localhost:8081/bot7041532621:AAEp0lMN8rfox597Nmp9w54RRC8XbyyAXKo/getUpdates', {
            method: 'POST',
            headers: {
                'Content-type': 'application/json'
            },
            body: JSON.stringify({
                "offset": getLastUpdate,
                "limit": 1
            })
        })

        const responseStatus = await request.status
        const responseJson = await request.json()
        if (responseStatus != 200) {
            return false
        }

        if (!responseJson.result.length) {
            return false
        }

        if (!responseJson.result[0].message) {
            return false
        }

        const updateId = responseJson.result[0].update_id
        const check = responseJson.result[0].message.forward_origin

        if (!check) {
            await fetchPsql('update lastUpdate set update_id = $1', updateId)
            return false
        }

        const chanelMsgId = responseJson.result[0].message.message_id
        const groupMsgId = responseJson.result[0].message.forward_origin.message_id

        const checkExists = await fetchPsql('select * from messages where msg_chanel_id = $1 and msg_group_id = $2', chanelMsgId, groupMsgId)
        if (checkExists.length) {
            await fetchPsql('update lastUpdate set update_id = $1', updateId)
            return false
        }

        await fetchPsql('insert into messages (msg_chanel_id, msg_group_id) values ($1, $2)', chanelMsgId, groupMsgId)
        await fetchPsql('update lastUpdate set update_id = $1', updateId)
    })
}

runner()