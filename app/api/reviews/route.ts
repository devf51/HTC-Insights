import { requireRole } from "@/lib/auth";
import { badRequest, readReviewForm, reviewErrorResponse } from "@/lib/review-request";
import { submitReview } from "@/lib/reviews";
import { companyChoiceSchema } from "@/lib/validation";

export async function POST(req: Request) {
  await requireRole("STUDENT");
  const form = await readReviewForm(req);
  if (form instanceof Response) return form;
  const choice = companyChoiceSchema.safeParse(form.fields);
  if (!choice.success) return badRequest(choice.error.issues[0].message);
  try {
    return Response.json(await submitReview(choice.data, form.data, form.photos), { status: 201 });
  } catch (e) {
    return reviewErrorResponse(e);
  }
}
