import { Redirect } from "expo-router";

/** Legacy deep links no longer expose native administration. */
export default function AdminRoute() { return <Redirect href="/profile"/>; }
