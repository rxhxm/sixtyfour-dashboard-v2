'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, FileText, TrendingUp } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { isAuthorizedEmail } from '@/lib/auth-guard'
import { createClient } from '@/lib/supabase/client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'

export default function SignupsPage() {
  const supabase = React.useMemo(() => createClient(), [])
  const [authVerified, setAuthVerified] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  // Auth Check
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || !isAuthorizedEmail(session.user.email)) {
        if (session) await supabase.auth.signOut()
        window.location.href = '/auth/signin'
        return
      }
      setAuthVerified(true)
      setAuthChecking(false)
    }
    checkAuth()
  }, [supabase])

  // Fetch Data
  useEffect(() => {
    if (authVerified) {
      fetch('/api/signup-analytics')
        .then(r => r.json())
        .then(data => {
          setData(data)
          setLoading(false)
        })
        .catch(e => console.error(e))
    }
  }, [authVerified])

  if (authChecking || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-muted border-t-primary" />
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Signups Analytics</h1>
          <p className="text-muted-foreground mt-1">Growth tracking from Interest Form to Platform Signup</p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Signups</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.totalSignups}</div>
              <p className="text-xs text-muted-foreground">Registered users</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Interest Forms</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.totalInterestForms}</div>
              <p className="text-xs text-muted-foreground">Form submissions</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.chartData.slice(-7).reduce((acc: any, cur: any) => acc + cur.signups, 0)}
              </div>
              <p className="text-xs text-muted-foreground">Signups last 7 days</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Growth Trend</CardTitle>
            <CardDescription>Daily signups vs interest form submissions</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    minTickGap={30}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                  <Bar dataKey="interestForms" name="Interest Forms" fill="#94a3b8" stackId="a" />
                  <Bar dataKey="signups" name="Platform Signups" fill="#0f172a" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Signups</CardTitle>
            <CardDescription>Latest 50 users joined</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium">User</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Source</th>
                    <th className="pb-3 font-medium">Company</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.recentSignups.map((user: any, i: number) => (
                    <tr key={i} className="hover:bg-muted/50">
                      <td className="py-3">
                        <div className="font-medium">{user.email}</div>
                        {user.name && <div className="text-xs text-muted-foreground">{user.name}</div>}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <Badge variant="outline">{user.provider}</Badge>
                          {user.from_interest_form && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
                              Interest Form
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {user.company || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

