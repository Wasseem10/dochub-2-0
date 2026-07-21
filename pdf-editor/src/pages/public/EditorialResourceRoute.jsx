import { useLocation } from "react-router-dom";
import { EDITORIAL_RESOURCE_BY_PATH } from "../../editorial/editorialResources.js";
import { EditorialResourcePage } from "./EditorialResourcePage.jsx";

export function EditorialResourceRoute() {
  const { pathname } = useLocation();
  const page = EDITORIAL_RESOURCE_BY_PATH.get(pathname);
  return page ? <EditorialResourcePage page={page} /> : null;
}
