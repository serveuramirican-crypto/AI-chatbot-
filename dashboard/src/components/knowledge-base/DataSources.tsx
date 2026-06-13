"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FileText, Link as LinkIcon, Table, AlignLeft, Puzzle, Plus, Loader2, Package } from "lucide-react"

type DataSource = {
  id: string
  type: string
  source_path: string
  status: string
  created_at: string
}

export function DataSources() {
  const [sources, setSources] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(true)
  
  const [dialogOpen, setDialogOpen] = useState(false)
  const [sourceType, setSourceType] = useState<string | null>(null)
  
  // Form states
  const [urlInput, setUrlInput] = useState("")
  const [textInput, setTextInput] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  
  // Product Form states
  const [productName, setProductName] = useState("")
  const [productDescription, setProductDescription] = useState("")
  const [productCategory, setProductCategory] = useState("")
  const [productPrice, setProductPrice] = useState("")
  const [productLink, setProductLink] = useState("")
  const [productImage, setProductImage] = useState("")
  const [productError, setProductError] = useState("")

  useEffect(() => {
    fetchSources()
  }, [])

  async function fetchSources() {
    setLoading(true)
    const { data, error } = await supabase
      .from('knowledge_sources')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) setSources(data)
    setLoading(false)
  }

  const handleOpenDialog = (type: string) => {
    setSourceType(type)
    setDialogOpen(true)
    setUrlInput("")
    setTextInput("")
    setFile(null)
    setProductName("")
    setProductDescription("")
    setProductCategory("")
    setProductPrice("")
    setProductLink("")
    setProductImage("")
    setProductError("")
  }

  const handleAddSource = async () => {
    setUploading(true)
    let sourcePath = ""
    
    if (sourceType === 'url') {
      sourcePath = urlInput
    } else if (sourceType === 'text') {
      sourcePath = "Plain Text Snippet"
    } else if (sourceType === 'product') {
      if (!productName.trim() || !productPrice.trim()) {
        setProductError("Product Name and Price are required.")
        setUploading(false)
        return
      }
      sourcePath = `Product: ${productName}`
    } else if ((sourceType === 'file' || sourceType === 'table') && file) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${fileName}`
      
      const { error: uploadError } = await supabase.storage
        .from('knowledge_files')
        .upload(filePath, file)
        
      if (uploadError) {
        console.error("Upload error:", uploadError)
        setUploading(false)
        return
      }
      sourcePath = filePath
    } else if (sourceType === 'integration') {
      sourcePath = "Integration setup pending"
    }

    const metadataPayload = 
      sourceType === 'text' ? { content: textInput } :
      sourceType === 'product' ? {
        name: productName,
        description: productDescription,
        category: productCategory,
        price: productPrice,
        link: productLink,
        image_url: productImage
      } : {}

    const { error } = await supabase
      .from('knowledge_sources')
      .insert([
        { 
          type: sourceType, 
          source_path: sourcePath, 
          status: 'active',
          metadata: metadataPayload
        }
      ])
      
    if (!error) {
      setDialogOpen(false)
      fetchSources()
    }
    setUploading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">Your Data Sources</h2>
        
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-slate-50 hover:bg-slate-900/90 transition-colors">
            <Plus className="mr-2 h-4 w-4" />
            Add data source
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Data Source Types</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleOpenDialog('product')} className="font-semibold text-blue-600 dark:text-blue-400">
                <Package className="mr-2 h-4 w-4" />
                <span>Add Product</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOpenDialog('text')} className="font-semibold text-blue-600 dark:text-blue-400">
                <AlignLeft className="mr-2 h-4 w-4" />
                <span>Text Input</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleOpenDialog('url')}>
                <LinkIcon className="mr-2 h-4 w-4" />
                <span>URL (Webpage/Sitemap)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOpenDialog('file')}>
                <FileText className="mr-2 h-4 w-4" />
                <span>File (PDF, TXT, DOCX, MD)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOpenDialog('table')}>
                <Table className="mr-2 h-4 w-4" />
                <span>Table (CSV, XLSX)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOpenDialog('integration')}>
                <Puzzle className="mr-2 h-4 w-4" />
                <span>Integration (Zendesk, Shopify)</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-md border">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading sources...</div>
        ) : sources.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No data sources added yet. Click the button above to add one.
          </div>
        ) : (
          <ul className="divide-y">
            {sources.map((source) => (
              <li key={source.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-md">
                    {source.type === 'product' && <Package className="h-5 w-5" />}
                    {source.type === 'url' && <LinkIcon className="h-5 w-5" />}
                    {source.type === 'file' && <FileText className="h-5 w-5" />}
                    {source.type === 'table' && <Table className="h-5 w-5" />}
                    {source.type === 'text' && <AlignLeft className="h-5 w-5" />}
                    {source.type === 'integration' && <Puzzle className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-900">{source.source_path}</p>
                    <p className="text-sm text-gray-500 capitalize">{source.type}</p>
                  </div>
                </div>
                <div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${source.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {source.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add Source Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {sourceType === 'integration' ? 'Add Integration' : 
               sourceType === 'product' ? 'Add Product' : 
               'Add Data Source'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
            {sourceType === 'product' && (
              <div className="space-y-4">
                {productError && <div className="text-sm text-red-500 font-medium">{productError}</div>}
                <div className="grid gap-2">
                  <Label htmlFor="productName">Product Name <span className="text-red-500">*</span></Label>
                  <Input 
                    id="productName" 
                    placeholder="e.g. Wireless Headphones" 
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="productPrice">Price <span className="text-red-500">*</span></Label>
                  <Input 
                    id="productPrice" 
                    placeholder="e.g. $99.99" 
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="productCategory">Category</Label>
                  <Input 
                    id="productCategory" 
                    placeholder="e.g. Electronics" 
                    value={productCategory}
                    onChange={(e) => setProductCategory(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="productDescription">Description</Label>
                  <Textarea 
                    id="productDescription" 
                    placeholder="Brief description of the product..." 
                    className="min-h-[80px]"
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="productLink">Product Link (URL)</Label>
                  <Input 
                    id="productLink" 
                    type="url"
                    placeholder="https://yourstore.com/product" 
                    value={productLink}
                    onChange={(e) => setProductLink(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="productImage">Product Image URL</Label>
                  <Input 
                    id="productImage" 
                    type="url"
                    placeholder="https://yourstore.com/image.jpg" 
                    value={productImage}
                    onChange={(e) => setProductImage(e.target.value)}
                  />
                </div>
              </div>
            )}
            {sourceType === 'url' && (
              <div className="grid gap-2">
                <Label htmlFor="url">Website URL</Label>
                <Input 
                  id="url" 
                  type="url" 
                  placeholder="https://example.com" 
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                />
              </div>
            )}
            {(sourceType === 'file' || sourceType === 'table') && (
              <div className="grid gap-2">
                <Label htmlFor="file">Upload File</Label>
                <Input 
                  id="file" 
                  type="file" 
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  accept={sourceType === 'table' ? ".csv,.xlsx" : ".pdf,.txt,.docx,.md"}
                />
                <p className="text-xs text-muted-foreground">
                  {sourceType === 'table' ? "Supported: CSV, XLSX" : "Supported: PDF, TXT, DOCX, MD"}
                </p>
              </div>
            )}
            {sourceType === 'text' && (
              <div className="grid gap-2">
                <Label htmlFor="text">Text Content</Label>
                <Textarea 
                  id="text" 
                  placeholder="Paste your plain text here..." 
                  className="min-h-[150px]"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                />
              </div>
            )}
            {sourceType === 'integration' && (
              <div className="grid gap-4">
                <p className="text-sm text-muted-foreground">Select an integration to connect to your knowledge base.</p>
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" className="h-24 flex flex-col gap-2">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/1/14/Zendesk_logo.png" alt="Zendesk" className="h-6 object-contain" />
                    Zendesk
                  </Button>
                  <Button variant="outline" className="h-24 flex flex-col gap-2">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/0/0e/Shopify_logo_2018.svg" alt="Shopify" className="h-6 object-contain" />
                    Shopify
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={uploading}>Cancel</Button>
            <Button onClick={handleAddSource} disabled={uploading}>
              {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
