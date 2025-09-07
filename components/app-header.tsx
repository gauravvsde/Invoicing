"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Settings, Upload } from "lucide-react"

interface CompanyInfo {
  name: string
  email: string
  phone: string
  address: string
  logo: string
}

export function AppHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const [mounted, setMounted] = useState(false)
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: "Pratham Urja Solutions",
    email: "",
    phone: "",
    address: "",
    logo: "",
  })
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = typeof window !== 'undefined' ? localStorage.getItem("company-info") : null
    if (stored) {
      setCompanyInfo(JSON.parse(stored))
    }
  }, [])

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    localStorage.setItem("company-info", JSON.stringify(companyInfo))
    setIsDialogOpen(false)
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setCompanyInfo((prev) => ({ ...prev, logo: e.target?.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {mounted && companyInfo.logo && (
              <img
                src={companyInfo.logo}
                alt="Company Logo"
                className="h-12 w-12 object-contain"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold font-heading text-foreground">{companyInfo.name}</h1>
              {companyInfo.email && <p className="text-sm text-muted-foreground">{companyInfo.email}</p>}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <h2 className="text-xl font-semibold">{title}</h2>
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Company Settings
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Company Information</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <Label htmlFor="logo">Company Logo</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input id="logo" type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                      <Button type="button" variant="outline" onClick={() => document.getElementById("logo")?.click()}>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Logo
                      </Button>
                      {companyInfo.logo && (
                        <img
                          src={companyInfo.logo || "/placeholder.svg"}
                          alt="Logo"
                          className="h-8 w-8 object-contain"
                        />
                      )}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="name">Company Name</Label>
                    <Input
                      id="name"
                      value={companyInfo.name}
                      onChange={(e) => setCompanyInfo((prev) => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={companyInfo.email}
                      onChange={(e) => setCompanyInfo((prev) => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={companyInfo.phone}
                      onChange={(e) => setCompanyInfo((prev) => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <textarea
                      id="address"
                      className="w-full min-h-[80px] px-3 py-2 text-sm border border-input bg-background rounded-md"
                      value={companyInfo.address}
                      onChange={(e) => setCompanyInfo((prev) => ({ ...prev, address: e.target.value }))}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Save</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </header>
  )
}
