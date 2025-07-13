"use client"

import BIcon from "@/components/BIcon"
import GenericPage from "@/components/dashboard/GenericPage"
import { YesNo } from "@/components/dashboard/YesNo"
import FileUpload from "@/components/elements/FileUpload"
import Spinner from "@/components/elements/Spinner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { sleep } from "@/lib/utils"
import Image from "next/image"
import Link from "next/link"
import { useRef, useState } from "react"
import { newBrandProfile, updateBrandProfile } from "@/lib/client/Api"
import { useRouter } from "next/navigation"

export default function ({ initialProfile, isNew }) {
  const [profile, setProfile] = useState(initialProfile)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const backgroundFileInputRef = useRef(null)
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(profile.backgroundUrl || null)

  const iconFileInputRef = useRef(null)
  const [iconImageUrl, setIconImageUrl] = useState(profile.iconUrl || null)

  const handleSave = async e => {
    setLoading(true)
    const payload = {
      name: profile.name,
      iconUrl: iconImageUrl,
      backgroundUrl: backgroundImageUrl,
    }
    try {
      if (isNew) {
        const { brandProfile } = await newBrandProfile(payload)
        router.replace(`/app/branding/${brandProfile.id}`)
      } else {
        await updateBrandProfile(initialProfile.id, payload)
      }
    } finally {
      setLoading(false)
    }
  }

  const [editingName, setEditingName] = useState(false)
  const nameRef = useRef()
  const handleSetName = () => {
    setProfile({ ...profile, name: nameRef.current.value })
    setEditingName(false)
  }

  const handleChooseBackground = e => {
    backgroundFileInputRef.current.click()
  }

  const handleChooseIcon = e => {
    iconFileInputRef.current.click()
  }

  const handleImageFiles = (setImageUrl, profileKey) => async e => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setImageUrl(reader.result)
      // setProfile({ ...profile, [profileKey]: reader.result })
    }
    reader.readAsDataURL(file)
  }

  const handleBackgroundFiles = handleImageFiles(setBackgroundImageUrl, "backgroundUrl")
  const handleLogoFiles = handleImageFiles(setIconImageUrl, "logoUrl")

  const dlBackgroundStyle = backgroundImageUrl ? {
    backgroundImage: `url(${backgroundImageUrl})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat"
  } : {}

  return (
    <>
      <form className="hidden">
        <input onChange={handleLogoFiles} ref={iconFileInputRef} type="file" />
      </form>
      <form className="hidden">
        <input onChange={handleBackgroundFiles} ref={backgroundFileInputRef} type="file" />
      </form>
      <GenericPage title={isNew ? "New Brand Profile" : profile.name} side={<Button onClick={handleSave} disabled={loading}>{loading && <Spinner />} Save</Button>}>
        <div className="border border-gray-200 border-dashed p-6 bg-gray-50 rounded-xl">
          <div className="bg-white rounded-lg">
            <div className="flex justify-center border-b border-b-gray-200 p-4">
              <span className="-m-1.5 p-1.5 flex items-center gap-x-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={handleChooseIcon}>
                      {iconImageUrl ?
                        <Image
                          alt="Brand Profile Logo"
                          width={32}
                          height={32}
                          src={iconImageUrl}
                        />
                        :
                        <div className="w-8 h-8 border border-dashed rounded-md border-gray-200 text-gray-300">
                          <BIcon className={"w-8 h-8"} name={"plus-circle-dotted"} center />
                        </div>
                      }
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side={"bottom"}>
                    Click to change icon
                  </TooltipContent>
                </Tooltip>
                {
                  editingName ?
                    <div className="flex gap-2">
                      <Input
                        placeholder="Your Company Name"
                        className="h-8 w-40"
                        ref={nameRef}
                        defaultValue={profile.name}
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            handleSetName()
                          }
                        }}
                      />
                      <YesNo onYes={handleSetName} onNo={() => setEditingName(false)} />
                    </div>
                    :
                    <div>
                      <Tooltip>
                        <TooltipTrigger onClick={() => setEditingName(true)}>
                          {/* <button> */}
                          <span className='ms-0.5 font-bold'>{profile.name || "Your Company Name"}</span>
                          {/* </button> */}
                        </TooltipTrigger>
                        <TooltipContent side={"bottom"}>
                          Click to change company name
                        </TooltipContent>
                      </Tooltip>
                    </div>
                }
              </span>
            </div>
            <div
              className="px-4 pt-2 flex items-center justify-center h-[560px] relative"
              style={dlBackgroundStyle}
            >
              <div className="bg-white opacity-50 backdrop-blur-sm rounded-2xl border p-6 shadow-xl w-full max-w-80 min-h-96 flex flex-col justify-between">
                <div>
                  <h2 className="font-bold text-xl/8 text-gray-800">Transfer Title</h2>
                  <p className="text-gray-600">Transfer description</p>
                  <hr className="my-2" />
                  <span><i className="bi bi-file-earmark me-1"></i>42 Files</span>
                  <p className="text-gray-600">123MB</p>
                </div>
                <div>
                  <div className="mt-auto text-center">
                    <p className="text-gray-600 mb-1 text-sm">Expires in 6mo</p>
                  </div>
                  <div className="flex gap-2">
                    <button disabled type="button" className="text-gray-400 bg-white border shadow rounded-lg px-3 py-1 grow-0"><BIcon name={"search"} /> Preview</button>
                    <button disabled={true} className="text-white bg-primary shadow rounded-lg px-3 py-1 grow hover:bg-primary-light disabled:bg-primary-light">Download</button>
                  </div>
                </div>
              </div>
              <div className="absolute w-full top-0 left-0 p-4 flex justify-center gap-2">
                <Button onClick={handleChooseBackground} variant={"outline"}>Choose Background</Button>
                {backgroundImageUrl != null && <Button className={"w-10"} variant={"outline"} onClick={() => setBackgroundImageUrl(null)}><BIcon name={"x-lg"} /></Button>}
              </div>
            </div>
          </div>
        </div>
      </GenericPage >
    </>
  )
}