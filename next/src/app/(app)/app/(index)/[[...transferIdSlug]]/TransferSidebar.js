"use client"

import BIcon from "@/components/BIcon"
import Modal from "@/components/elements/Modal"
import { Skeleton } from "@/components/ui/skeleton"
import { ApplicationContext } from "@/context/ApplicationContext"
import { DashboardContext } from "@/context/DashboardContext"
import { SelectedTransferContext } from "@/context/SelectedTransferProvider"
import { deleteTransfer, getTransferDownloadLink, putTransfer, sendTransferByEmail } from "@/lib/client/Api"
import { EXPIRATION_TIMES } from "@/lib/constants"
import { humanFileSize } from "@/lib/transferUtils"
import { parseTransferExpiryDate, tryCopyToClipboard } from "@/lib/utils"
import { Transition } from "@headlessui/react"
import { useRouter } from "next/navigation"
import { useContext, useEffect, useMemo, useRef, useState } from "react"
import { YesNo } from "../../../../../components/dashboard/YesNo"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectTriggerFix } from "@/components/ui/select"
import Image from "next/image"

export default function ({ user, selectedTransfer }) {

  const router = useRouter()

  const { displayNotification, displayErrorModal } = useContext(DashboardContext)
  const { refreshTransfer } = useContext(SelectedTransferContext)

  const [showEmailList, setShowEmailList] = useState(false)
  const [showForwardTransfer, setShowForwardTransfer] = useState(false)

  const titleRef = useRef(null)
  const [editingTitle, setEditingTitle] = useState(false)

  const messageRef = useRef(null)
  const [editingMessage, setEditingMessage] = useState(false)

  const transferLink = useMemo(() => getTransferDownloadLink(selectedTransfer), [selectedTransfer])

  const expiryDate = parseTransferExpiryDate(selectedTransfer?.expiresAt)
  const formattedExpiryDate = expiryDate ? expiryDate.toISOString().split('T')[0] : ''

  const maxPlanExpirationDays = useMemo(() =>
    EXPIRATION_TIMES.filter(t => (user.plan == "pro" ? t.pro : t.starter)).reduce((max, current) =>
      current.days > max.days ? current : max, { days: -1 }).days, [EXPIRATION_TIMES])

  const maxExpiryDate = new Date(selectedTransfer?.createdAt || 0);
  maxExpiryDate.setDate(maxExpiryDate.getDate() + maxPlanExpirationDays);
  const formattedMaxExpiryDate = maxExpiryDate ? maxExpiryDate.toISOString().split('T')[0] : ''
  const formattedMinExpiryDate = new Date().toISOString().split('T')[0]

  const handleDateInputChange = async e => {
    const elem = e.target
    const value = elem.value

    const expiresAt = new Date(value)

    if (expiresAt <= new Date(formattedMinExpiryDate) || expiresAt > maxExpiryDate) {
      // elem.value = formattedExpiryDate
      return;
    }

    await putTransfer(selectedTransfer.id, { expiresAt })

    displayNotification("success", "Expiration Changed", `The expiration date was successfully changed to ${expiresAt.toLocaleDateString()}`)
    router.refresh()
    refreshTransfer()
  }

  const textarea = useMemo(() => {
    return (
      <textarea
        ref={messageRef}
        key={Math.random()}
        id="description"
        name="description"
        rows={4}
        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
        defaultValue={selectedTransfer?.description}
      />
    )
  }, [selectedTransfer])

  const dateInput = useMemo(() => {
    if (!selectedTransfer) {
      return (
        <div className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm/6">
          <Skeleton className={"h-4 my-1 w-28 ms-2"} />
        </div>
      )
    }
    else {
      return (
        <input
          key={Math.random()}
          onChange={handleDateInputChange}
          defaultValue={formattedExpiryDate}
          id="expirationDate"
          name="expirationDate"
          type="date"
          min={formattedMinExpiryDate}
          max={formattedMaxExpiryDate}
          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm/6"
        />
      )
    }
  }, [selectedTransfer])

  const handleClose = e => {
    // hideSidebar()
    router.push(".")
  }

  const handleCopy = async e => {
    if (await tryCopyToClipboard(transferLink)) {
      displayNotification("success", "Copied Link", "The Transfer link was successfully copied to the clipboard!")
    }
  }

  const handleDelete = async e => {
    await deleteTransfer(selectedTransfer.id)
    // hideSidebar()
    // router.refresh()
    // router.push(".")
    // refreshTransfer()
    // NextJS can suck my fucking balls https://github.com/vercel/next.js/discussions/70786
    window.location.replace(".")
  }

  const handleLinkKeyDown = async e => {
    if (e.key === "Enter") {
      handleCopy()
      e.preventDefault()
    }
  }

  const handleShowEmailList = e => {
    setShowEmailList(true)
  }

  const handleSaveTitle = async e => {
    setEditingTitle(false)
    await putTransfer(selectedTransfer.id, { name: titleRef.current.value })
    router.refresh()
    refreshTransfer()
  }

  const handleSaveMessage = async e => {
    setEditingMessage(false)
    await putTransfer(selectedTransfer.id, { description: messageRef.current.value })
    router.refresh()
    refreshTransfer()
  }

  const onSendByEmailFormSubmit = async e => {
    e.preventDefault()

    if (user.plan == "starter" && selectedTransfer.emailsSharedWith.length >= 25) {
      displayErrorModal("With the Starter plan, you can only send a file transfer to up to 25 email recipients at once. Upgrade to Pro to send up to 200 emails per transfer.")
      return
    }
    if (user.plan == "pro" && selectedTransfer.emailsSharedWith.length >= 200) {
      displayErrorModal("With the Pro plan, you can only send a file transfer to up to 200 email recipients at once.")
      return
    }

    const form = e.target

    // if (!form.checkValidity()) {
    //   form.reportValidity();
    //   return;
    // }

    const formData = new FormData(form)
    const email = formData.get("email")

    await sendTransferByEmail(selectedTransfer.id, [email])

    displayNotification("success", "Email sent", `The Transfer link was successfully sent to ${email}!`)
    refreshTransfer()
    setShowForwardTransfer(false)
  }

  // const handleSetProfileId = async profileId => {
  //   setBrandProfileId(profileId)
  //   await putTransfer(selectedTransfer.id, { brandProfileId: profileId })
  //   refreshTransfer()
  //   displayNotification("success", "Brand profile updated", `The brand profile for this transfer was changed!`)
  // }

  // const [brandProfileId, setBrandProfileId] = useState(selectedTransfer?.brandProfileId || "none")
  // const brandProfile = brandProfiles.find(profile => profile.id === selectedTransfer?.brandProfileId)

  return (
    <>
      <Modal title={`Shared with ${selectedTransfer?.emailsSharedWith?.length} people`} icon={"envelope"} buttons={[
        { title: "Ok", onClick: () => setShowEmailList(false) }
      ]} show={showEmailList} onClose={() => setShowEmailList(false)}>
        {/* <p className="text-sm font-medium mb-1"></p> */}
        <ul className="text-start text-sm text-gray-600 list-inside list-disc min-w-60">
          {selectedTransfer?.emailsSharedWith?.map((entry, index) => <li key={index}>{entry.email}</li>)}
        </ul>
      </Modal>
      <Modal title={`Forward Transfer`} icon={"envelope-plus"} buttons={[
        { title: "Forward", form: "sendByEmailForm" },
        { title: "Cancel", onClick: () => setShowForwardTransfer(false) }
      ]} show={showForwardTransfer} onClose={() => setShowForwardTransfer(false)}>
        {/* <p className="text-sm font-medium mb-1"></p> */}
        <p className="text-sm text-gray-500">
          You can forward this transfer by entering an email address below. The email will include the title and message set for this transfer.
        </p>
        <form id="sendByEmailForm" onSubmit={onSendByEmailFormSubmit}>
          <div className="mt-2">
            <input
              id="forwardEmail"
              placeholder="Email address"
              name="email"
              type="email"
              autoComplete="email"
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm/6"
            />
          </div>
        </form>
      </Modal>
      <div className="md:border-s flex h-full flex-col divide-y divide-gray-200 bg-white">
        <div className="h-0 flex-1 overflow-y-auto">
          <div className="bg-white px-4 py-6 sm:px-6 border-b">
            <div className="mb-1">
              <button
                type="button"
                onClick={handleClose}
                className="relative rounded-md text-gray-600 hover:text-primary hover:underline p-1"
              >
                <BIcon name={"arrow-left-circle"} aria-hidden="true" />
                <span className="ms-1.5">Close</span>
              </button>
            </div>
            <div className="flex items-center justify-between">
              {
                editingTitle ?
                  <div className="flex gap-2">
                    <input ref={titleRef} defaultValue={selectedTransfer.name}></input>
                    <YesNo onYes={handleSaveTitle} onNo={() => setEditingTitle(false)} />
                  </div>
                  :
                  (selectedTransfer ?
                    <h2 className="text-3xl font-semibold tracking-tight">
                      {selectedTransfer.name} <button onClick={() => setEditingTitle(true)} className="ms-1 text-2xl text-gray-500 hover:text-gray-600"><BIcon name={"pencil"} /></button>
                    </h2>
                    :
                    <Skeleton className={"h-[38px] w-72"} />
                  )
              }
            </div>
            <div className="mt-2">
              {selectedTransfer ?
                (
                  selectedTransfer.files.length > 0 &&
                  <div className="text-sm text-gray-600">
                    <span>{selectedTransfer.files.length} File{selectedTransfer.files.length > 1 ? "s" : ""}</span>
                    <BIcon name={"dot"} />
                    <span>{humanFileSize(selectedTransfer.size, true)}</span>
                    <BIcon name={"dot"} />
                    <span>Created {new Date(selectedTransfer.createdAt).toLocaleDateString()}</span>
                  </div>
                )
                :
                <Skeleton className={"h-[18px] w-56"} />
              }
            </div>
          </div>
          <div className="flex flex-1 flex-col justify-between">
            <div className="divide-y divide-gray-200 px-4 sm:px-6">
              <div className="space-y-6 pb-5 pt-6">
                <div className="max-w-80">
                  {/* <label className="block text-sm font-bold leading-6 text-gray-900">
                    Link
                  </label> */}
                  <div className="relative mt-2 flex items-center">
                    <input
                      onKeyDown={handleLinkKeyDown}
                      type="url"
                      className="block w-full rounded-lg border-0 py-2.5 ps-4 pr-28 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                      value={transferLink || ""}
                      readOnly
                    />
                    <div className="absolute inset-y-0 right-0 flex py-1.5 pr-1.5">
                      <button type="button" onClick={handleCopy} className="inline-flex items-center rounded border border-gray-200 px-1 pe-1.5 font-sans text-xs text-primary font-medium bg-white hover:bg-gray-50">
                        <BIcon name={"copy"} className={"mr-1 ms-1"} />Copy Link
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <label htmlFor="description" className="block text-base font-bold leading-6 text-gray-900">
                    Message
                  </label>
                  {
                    editingMessage ?
                      <div className="mt-2">
                        {textarea}
                        <div className="mt-2">
                          <YesNo onYes={handleSaveMessage} onNo={() => setEditingMessage(false)} />
                        </div>
                      </div>
                      :
                      <div className="mt-2">
                        {selectedTransfer ?
                          <p className="text-gray-600 sm:text-sm">
                            {selectedTransfer.description || "No message"}
                            <button onClick={() => setEditingMessage(true)} className="ms-1 text-gray-500 hover:text-gray-600"><BIcon name={"pencil"} /></button>
                          </p>
                          :
                          <Skeleton className={"h-[20px] w-32"} />
                        }
                      </div>

                  }
                </div>
                <div>
                  {selectedTransfer ?
                    <>
                      <label className="block text-base font-bold leading-6 text-gray-900">
                        Shared with {selectedTransfer.emailsSharedWith.length} {selectedTransfer.emailsSharedWith.length == 1 ? "person" : "people"}
                      </label>
                      <div>
                        {selectedTransfer.emailsSharedWith && selectedTransfer.emailsSharedWith.length > 0 && (
                          <div className="mt-2 sm:text-sm text-gray-600">
                            Last shared with {selectedTransfer.emailsSharedWith[selectedTransfer.emailsSharedWith.length - 1].email}{" "}
                            {selectedTransfer.emailsSharedWith.length > 1 && <a href="#" className="underline hover:text-primary" onClick={handleShowEmailList}>and {selectedTransfer.emailsSharedWith.length - 1} more</a>}
                          </div>
                        )}
                        <button onClick={() => setShowForwardTransfer(true)} className="sm:text-sm text-primary hover:text-primary-light hover:underline">Forward &rarr;</button>
                      </div>
                    </>
                    :
                    <div>
                      <Skeleton className={"h-[20px] my-1 w-36"} />
                      <button onClick={() => setShowForwardTransfer(true)} className="sm:text-sm text-primary hover:text-primary-light hover:underline">Forward &rarr;</button>
                    </div>
                  }
                </div>
                <div>
                  <label htmlFor="expirationDate" className="block text-base font-bold leading-6 text-gray-900">
                    Expiration Date
                  </label>
                  <div className="mt-2 max-w-52 min-w-40 w-fit">
                    {dateInput}
                  </div>
                </div>
                {selectedTransfer?.brandProfile && (
                  <div>
                    <label htmlFor="brandProfile" className="block text-base font-bold leading-6 text-gray-900">
                      Brand Profile
                    </label>
                    <div className="mt-2 max-w-52 min-w-40 w-fit">
                      {
                        selectedTransfer ?
                          <div className="flex items-center">
                            <Image alt="Brand Profile Icon" width={32} height={32} src={selectedTransfer.brandProfile.iconUrl} />
                            <span className="ms-1.5 font-semibold text-gray-700">{selectedTransfer.brandProfile.name}</span>
                          </div>
                          :
                          <Skeleton className={"h-8 w-32"} />
                      }
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-shrink-0 justify-end px-4 py-4">
          <button
            type="button"
            onClick={handleDelete}
            className="text-red-500 hover:text-red-400 mr-auto"
          >
            <BIcon
              name={"trash"}
              aria-hidden="true"
              className=""
            />
            <span className="ms-2">Delete</span>
          </button>
          {/* <button
            type="button"
            onClick={handleClose}
            className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="ml-4 inline-flex justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Save
          </button> */}
        </div>
      </div>
    </>
  )
}