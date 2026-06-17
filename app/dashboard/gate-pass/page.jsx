import { cookies, headers } from 'next/headers'
import Header from '@/components/Header'
import ErrorPage from '@/components/ErrorPage'
import GatePass from '@/components/GatePass'
import { parseUser } from '@/lib/utils'

export default async function GatePassPage() {
    const headerStore = await headers()
    const cookieStore = await cookies()
    const user = parseUser(headerStore)
    const activeRole = cookieStore.get('active-role')?.value

    if (activeRole !== 'College Admin' && activeRole !== 'Gate Keeper' && activeRole !== 'Teacher') {
        return (
            <ErrorPage
                statusCode={403}
                title="Access Denied"
                description="You do not have permission to view this page."
            />
        )
    }

    return (
        <div className="flex flex-col space-y-0">
            <Header
                title="GATE PASS"
                subTitle="Set passes and scan student ID barcodes"
            />
            <GatePass apiKey={process.env.API_KEY} activeRole={activeRole} currentUser={user} />
        </div>
    )
}
