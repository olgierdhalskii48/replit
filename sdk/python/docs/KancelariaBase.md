# KancelariaBase


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **str** |  | 
**location** | **str** |  | 
**specialization** | **str** |  | 

## Example

```python
from openapi_client.models.kancelaria_base import KancelariaBase

# TODO update the JSON string below
json = "{}"
# create an instance of KancelariaBase from a JSON string
kancelaria_base_instance = KancelariaBase.from_json(json)
# print the JSON string representation of the object
print(KancelariaBase.to_json())

# convert the object into a dict
kancelaria_base_dict = kancelaria_base_instance.to_dict()
# create an instance of KancelariaBase from a dict
kancelaria_base_from_dict = KancelariaBase.from_dict(kancelaria_base_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


