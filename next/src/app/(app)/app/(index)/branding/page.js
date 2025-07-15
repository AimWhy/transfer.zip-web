import BIcon from "@/components/BIcon";
import GenericPage from "@/components/dashboard/GenericPage";
import EmptySpace from "@/components/elements/EmptySpace";
import { Button } from "@/components/ui/button";
import BrandProfileCard from "./BrandProfileCard";
import BrandProfile from "@/lib/server/mongoose/models/BrandProfile";
import { useServerAuth } from "@/lib/server/wrappers/auth";
import Link from "next/link";

export default async function () {
  const { user } = await useServerAuth()

  const profiles = await BrandProfile.find({ author: user._id })

  const hasFeature = user.getPlan() == "pro"

  const side = hasFeature ?
    <Button asChild><Link href={"/app/branding/new"}><BIcon name={"plus-lg"} />New Brand Profile</Link></Button>
    :
    <Button disabled><BIcon name={"plus-lg"} />New Brand Profile</Button>

  return (
    <GenericPage title={"Branding"} side={side}>
      {
        profiles.length > 0 ?
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {profiles.map(profile => {
              const { id, name, iconUrl, backgroundUrl } = profile.friendlyObj()
              return (
                <BrandProfileCard
                  key={id}
                  id={id}
                  name={name}
                  iconUrl={iconUrl}
                  backgroundUrl={backgroundUrl}
                />
              )
            })}
          </div>
          :
          <EmptySpace
            title={"Showcase Your Unique Brand Identity"}
            subtitle={"Add your own logo, customize backgrounds, and include your branding directly in emails and download pages for a seamless, professional look."}
          >
            {!hasFeature && <Button asChild><Link className="mt-4" href={"/app/settings?upgrade"}>Upgrade to Pro &rarr;</Link></Button>}
          </EmptySpace>
      }
    </GenericPage>
  )
}