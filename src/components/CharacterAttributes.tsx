import { useId, useState } from "react";
import type { CharacterAttributes as Attributes } from "../types";
import {
  attributeGroups,
  characterProfile,
  validAttribute,
} from "../characterAttributes";
import { Field } from "./UI";

export function CharacterAttributeFields({
  value = {},
  onChange,
}: {
  value?: Attributes;
  onChange: (attributes: Attributes) => void;
}) {
  const [badInputs, setBadInputs] = useState<Set<string>>(() => new Set());
  return (
    <section
      className="character-attributes"
      aria-label="Sayısal karakter özellikleri"
    >
      <h3 className="character-section-title">
        Karakter özellikleri <small>İsteğe bağlı</small>
      </h3>
      <p className="attribute-help">
        0–100 arasında tam sayı girin. 0 en düşük, 100 en yüksek seviyedir. Boş
        bıraktığınız özellikler değerlendirilmez; toplamın 100 olması gerekmez.
      </p>
      {attributeGroups.map((group) => (
        <fieldset className="attribute-group" key={group.label}>
          <legend>{group.label}</legend>
          <div className="attribute-inputs">
            {group.traits.map(({ id, label }) => {
              const invalid =
                badInputs.has(id) ||
                (value[id] !== undefined && !validAttribute(value[id]));
              return (
                <Field
                  key={id}
                  label={label}
                  hint={
                    invalid ? "0–100 arasında bir tam sayı girin." : undefined
                  }
                >
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100}
                    step={1}
                    placeholder="—"
                    value={value[id] ?? ""}
                    aria-invalid={invalid || undefined}
                    onInput={(event) => {
                      const badInput = event.currentTarget.validity.badInput;
                      setBadInputs((current) => {
                        if (current.has(id) === badInput) return current;
                        const next = new Set(current);
                        if (badInput) next.add(id);
                        else next.delete(id);
                        return next;
                      });
                    }}
                    onChange={(event) => {
                      const next = { ...value };
                      if (event.target.value === "") delete next[id];
                      else next[id] = event.target.valueAsNumber;
                      onChange(next);
                    }}
                  />
                </Field>
              );
            })}
          </div>
        </fieldset>
      ))}
    </section>
  );
}

export function CharacterProfile({
  attributes,
  compact = false,
}: {
  attributes?: Attributes;
  compact?: boolean;
}) {
  const headingId = useId();
  const { ranked, dominant, axes } = characterProfile(attributes);
  const limit = compact ? 3 : 5;
  const rows = (traits: typeof ranked) =>
    traits.map((trait) => (
      <div className="attribute-row" key={trait.id}>
        <div className="attribute-row-label">
          <span>{trait.label}</span>
          <strong>
            {trait.value}
            <small> / 100</small>
          </strong>
        </div>
        <div
          className="attribute-ruler"
          role="meter"
          aria-label={trait.label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={trait.value}
        >
          <span
            className="attribute-fill"
            style={{ width: trait.value + "%" }}
          />
          <i className="attribute-marker" style={{ left: trait.value + "%" }} />
        </div>
      </div>
    ));
  return (
    <section
      className={"character-profile " + (compact ? "compact" : "")}
      aria-labelledby={headingId}
    >
      <header className="attribute-profile-heading">
        <h3 id={headingId}>Özellik cetveli</h3>
        <span>{ranked.length} özellik</span>
      </header>
      {!ranked.length ? (
        <p className="attribute-help">
          Karaktere sayı eklediğinizde baskın özellikleri ve eğilimleri burada
          görünür.
        </p>
      ) : (
        <>
          <p className="attribute-dominance" aria-live="polite">
            {dominant.length ? (
              <>
                <span>
                  {dominant.length === 1
                    ? "Baskın özellik"
                    : "Eşit baskın özellikler"}
                </span>
                <strong>
                  {dominant.map((trait) => trait.label).join(" · ")}
                </strong>
              </>
            ) : (
              "Girilen değerler 0; henüz baskın bir özellik yok."
            )}
          </p>
          <div className="attribute-scale" aria-hidden="true">
            {[0, 25, 50, 75, 100].map((tick) => (
              <span key={tick}>{tick}</span>
            ))}
          </div>
          <div className="attribute-ranking">
            {rows(ranked.slice(0, limit))}
          </div>
          {ranked.length > limit && (
            <details className="attribute-more">
              <summary>Diğer {ranked.length - limit} özelliği göster</summary>
              <div className="attribute-ranking">
                {rows(ranked.slice(limit))}
              </div>
            </details>
          )}
          <div className="attribute-tendencies">
            <h4>Eğilimler</h4>
            <p className="attribute-help">
              {axes.length
                ? "İşaret, iki değerin oranına göre daha ağır basan tarafa yaklaşır. Orta nokta eşit ağırlığı gösterir."
                : "Karşılaştırma için bir çiftin iki değerini de girin: örneğin Mantık ve Duygusallık ya da Cesaret ve Temkin."}
            </p>
            {axes.map((axis) => {
              const tendency =
                axis.leftValue === axis.rightValue
                  ? "Dengeli"
                  : (axis.leftValue > axis.rightValue
                      ? axis.left
                      : axis.right) + " ağırlıklı";
              return (
                <div className="attribute-axis" key={axis.id}>
                  <div className="attribute-axis-labels">
                    <span>
                      {axis.left} <b>{axis.leftValue}</b>
                    </span>
                    <span>
                      {axis.right} <b>{axis.rightValue}</b>
                    </span>
                  </div>
                  <div
                    className="attribute-ruler tendency-ruler"
                    role="meter"
                    aria-label={axis.left + " – " + axis.right}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(axis.position)}
                    aria-valuetext={
                      axis.left +
                      " " +
                      axis.leftValue +
                      ", " +
                      axis.right +
                      " " +
                      axis.rightValue +
                      "; " +
                      tendency
                    }
                  >
                    <i className="attribute-center" />
                    <i
                      className="attribute-marker"
                      style={{ left: axis.position + "%" }}
                    />
                  </div>
                  <small>{tendency}</small>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}