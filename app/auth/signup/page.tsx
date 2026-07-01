import Link from "next/link";
import { signUpAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/field";

export default function SignupPage({
  searchParams
}: {
  searchParams?: { error?: string };
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="text-sm font-semibold text-blue-700">TariffOS</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">Create workspace</h1>
          <p className="mt-1 text-sm text-slate-600">One organization is created automatically on first login.</p>
        </CardHeader>
        <CardContent>
          {searchParams?.error ? (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {searchParams.error}
            </div>
          ) : null}
          <form action={signUpAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" name="fullName" type="text" defaultValue="Demo User" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue="demo@tariffos.local" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" defaultValue="demo-password" required />
            </div>
            <Button className="w-full" type="submit">Create workspace</Button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link className="font-medium text-blue-700" href="/auth/login">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
