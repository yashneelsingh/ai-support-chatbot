import cron        from 'node-cron'
import nodemailer  from 'nodemailer'
import { pool }    from '../services/postgres.js'
import Session     from '../models/Session.js'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,   // use Gmail App Password
  },
})

/**
 * Sends a daily summary email to the admin at 8:00 AM.
 * Shows total sessions and messages from the last 24 hours.
 */
export const startReminderJob = () => {
  cron.schedule('0 8 * * *', async () => {
    console.log('Running daily analytics email job...')

    try {
      const { rows } = await pool.query(
        `SELECT COUNT(*) AS total FROM sessions
         WHERE created_at >= NOW() - INTERVAL '24 hours'`
      )

      const recentMessages = await Session.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 86400000) } } },
        { $project: { count: { $size: '$messages' } } },
        { $group: { _id: null, total: { $sum: '$count' } } },
      ])

      const sessionsToday = rows[0]?.total ?? 0
      const messagesToday = recentMessages[0]?.total ?? 0

      await transporter.sendMail({
        from:    `"AI Chatbot" <${process.env.EMAIL_USER}>`,
        to:      process.env.EMAIL_USER,
        subject: '📊 Daily Chatbot Summary',
        html: `
          <h2>Daily Summary — AI Support Chatbot</h2>
          <p>Here's a quick overview of the last 24 hours:</p>
          <ul>
            <li><strong>New sessions:</strong> ${sessionsToday}</li>
            <li><strong>Total messages:</strong> ${messagesToday}</li>
          </ul>
          <p>Login to the admin panel for full analytics.</p>
        `,
      })

      console.log('Daily summary email sent ✅')
    } catch (err) {
      console.error('Reminder job failed:', err.message)
    }
  })

  console.log('📅 Daily reminder job scheduled (8:00 AM)')
}
