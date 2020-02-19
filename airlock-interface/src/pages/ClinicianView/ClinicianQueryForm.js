import {
  AutoComplete,
  Button,
  Card,
  Col,
  Form,
  Input,
  Radio,
  Row,
  Slider
} from "antd";
import React, { Component } from "react";

import Fade from "react-reveal";
import axios from "axios";

const { TextArea } = Input;
const AutoCompleteOption = AutoComplete.Option;

class ClinicianQuery extends Component {
  state = {
    autocompleteData: [],
    hpoGenes: []
  };

  /* GET request to EBI for HPO autocomplete suggestions */
  search(query) {
    let url = `https://api.monarchinitiative.org/api/search/entity/autocomplete/${query}?category=phenotype&prefix=HP&rows=5&start=0&minimal_tokenizer=false`;
    let xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = "json";
    xhr.onload = () => {
      let status = xhr.status;
      if (status === 200) {
        this.setState({
          autocompleteData: xhr.response.docs
        });
      }
    };
    xhr.send();
  }

  /* 
  Don't spam them with requests
  Only send on substantial strings, and every second letter
  */
  onSearch = query => {
    if (query.length >= 3 && query.length % 2 === 0) this.search(query);
  };

  onSelect = query => {
    let url = `https://api.monarchinitiative.org/api/bioentity/phenotype/${query}/genes?rows=100&facet=false&unselect_evidence=false&exclude_automatic_assertions=false&fetch_objects=false&use_compact_associations=true&direct=false&direct_taxon=false`;
    let xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = "json";
    xhr.onload = () => {
      let status = xhr.status;
      if (status === 200) {
        /* Use KCCG's gene elasticsearch to translate gene names to genome positions */
        const url = "https://dr-sgc.kccg.garvan.org.au/_elasticsearch/_search";
        const config = {
          headers: {
            "Content-Type": "application/json"
          }
        };

        var genes = xhr.response.compact_associations[0].objects.map(gene => {
          return gene.substring(5);
        });
        const numGenes = genes.length;
        const body = JSON.stringify({
          from: 0,
          size: numGenes,
          query: {
            dis_max: {
              queries: [
                {
                  match: {
                    description: {
                      query: genes.join(" "),
                      fuzziness: 1,
                      boost: 4
                    }
                  }
                }
              ],
              tie_breaker: 0.4
            }
          },
          sort: [{ _score: { order: "desc" } }]
        });

        axios.post(url, body, config).then(res => {
          this.props.form.setFieldsValue({
            genes: res.data.hits.hits.map(gene => {
              return gene._source.symbol;
            }).join(`
`)
          });
        });
      }
    };
    xhr.send();
  };

  handleSubmit = e => {
    e.preventDefault();
    this.props.form.validateFields((err, values) => {
      if (!err) {
        this.props.parentCallback(true, values);
      }
    });
  };

  render() {
    const { getFieldDecorator, isFieldsTouched } = this.props.form;

    const data = this.state.autocompleteData.map(hp => (
      <AutoCompleteOption key={hp.id}>{hp.label}</AutoCompleteOption>
    ));

    return (
      <Form layout="horizontal" onSubmit={this.handleSubmit}>
        <Fade>
          <Row>
            <Col span={24}>
              <Form.Item label="Patient has phenotype..." help={""}>
                {getFieldDecorator("hpo")(
                  <AutoComplete
                    dataSource={data}
                    onSearch={this.onSearch}
                    onSelect={query => this.onSelect(query)}
                    placeholder={"HPO (optional)"}
                    backfill
                  />
                )}
              </Form.Item>
            </Col>
          </Row>
        </Fade>

        <Fade>
          <div>
            <Row>
              <Col span={8}>
                <Card type="inner" title="Region">
                  <Form.Item>
                    {getFieldDecorator("region")(
                      <TextArea
                        autoSize
                        placeholder="Enter region or list of regions"
                      ></TextArea>
                    )}
                  </Form.Item>
                </Card>
              </Col>
              <Col span={8}>
                <Card type="inner" title="Genes">
                  <Form.Item>
                    {getFieldDecorator("genes")(
                      <TextArea
                        autoSize
                        placeholder="Enter gene or list of genes"
                      ></TextArea>
                    )}
                  </Form.Item>
                </Card>
              </Col>

              <Col span={8}>
                <Card type="inner" title="Variants">
                  <Form.Item>
                    {getFieldDecorator("variants")(
                      <TextArea
                        autoSize
                        placeholder="Enter variant or list of variants"
                      ></TextArea>
                    )}
                  </Form.Item>
                </Card>
              </Col>
            </Row>
          </div>
        </Fade>

        <Fade>
          <Form.Item>
            <h4>Allele Frequency</h4>
            {getFieldDecorator("alleleFreq", {
              initialValue: 1
            })(
              <Slider
                step={0.1}
                max={10}
                tipFormatter={value => {
                  return `${value}%`;
                }}
              />
            )}
          </Form.Item>
        </Fade>

        <Fade>
          <Form.Item>
            <h4>Variant Type</h4>
            {getFieldDecorator("variantType", {
              initialValue: "both"
            })(
              <Radio.Group>
                <Radio.Button value="snp">SNP</Radio.Button>
                <Radio.Button value="indel">Indel</Radio.Button>
                <Radio.Button value="both">Both</Radio.Button>
              </Radio.Group>
            )}
          </Form.Item>
        </Fade>

        <Fade>
          <Form.Item>
            <h4>Variant Type</h4>
            {getFieldDecorator("impact", {
              initialValue: "all"
            })(
              <Radio.Group>
                <Radio.Button value="high">High</Radio.Button>
                <Radio.Button value="highmed">High & Med</Radio.Button>
                <Radio.Button value="all">All</Radio.Button>
              </Radio.Group>
            )}
          </Form.Item>
        </Fade>

        <Fade>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              disabled={
                !isFieldsTouched(["region", "hpo", "genes", "variants"])
              }
            >
              Next
            </Button>
          </Form.Item>
        </Fade>
      </Form>
    );
  }
}

const ClinicianQueryForm = Form.create({ name: "clinician_query_form" })(
  ClinicianQuery
);
export default ClinicianQueryForm;
